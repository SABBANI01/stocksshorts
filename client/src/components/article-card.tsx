import { useState, useEffect, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Share2, TrendingUp, Lock, Languages } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn, formatPriceChange, getCategoryColor } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import type { Article } from "@shared/schema";

// Time ago helper function
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const articleDate = new Date(dateString);
  const diffInMs = now.getTime() - articleDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return articleDate.toLocaleDateString();
}

interface ArticleCardProps {
  article: Article;
  isActive: boolean;
  style?: React.CSSProperties;
  onLanguageToggle?: () => void;
}

function getSentimentColor(sentiment: string | null): string {
  if (!sentiment) return "";
  
  const s = sentiment.toLowerCase().trim();
  if (s === 'bullish' || s === 'positive') {
    return "border-l-4 border-green-500";
  } else if (s === 'bearish' || s === 'negative') {
    return "border-l-4 border-red-500";
  } else if (s === 'neutral') {
    return ""; // No color for neutral sentiment
  }
  return "";
}

const ArticleCard = memo(function ArticleCard({ article, isActive, style, onLanguageToggle }: ArticleCardProps) {
  const sentimentColorClass = getSentimentColor(article.sentiment);
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Reset image error and force reload when article changes
  useEffect(() => {
    setImageError(false);
    setImageKey(prev => prev + 1);
  }, [article.id, article.imageUrl]);

  // Track reading time when article becomes active
  useEffect(() => {
    if (isActive) {
      setStartTime(Date.now());
    } else if (startTime) {
      // Record time spent when article becomes inactive
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (timeSpent >= 2) { // Only record if spent at least 2 seconds
        const sessionId = sessionStorage.getItem('sessionId') || 
          (() => {
            const id = Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('sessionId', id);
            return id;
          })();
        
        apiRequest('/api/article-views', {
          method: 'POST',
          body: JSON.stringify({
            articleId: article.id,
            sessionId,
            timeSpent
          })
        }).catch(console.error);
      }
      setStartTime(null);
    }
  }, [isActive, article.id, startTime]);
  
  // Sentiment analysis for price change
  const priceChangeValue = parseFloat((article.priceChange || "0").replace(/[^\d.-]/g, ""));
  const sentiment = priceChangeValue > 0 ? 'positive' : priceChangeValue < 0 ? 'negative' : 'neutral';

  const getPriceChangeSentimentColor = () => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20';
      case 'negative':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      default:
        return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/20';
    }
  };
  const { language, setLanguage, isTranslating, setIsTranslating } = useLanguage();

  // Determine news sentiment based on keywords
  const getSentiment = (title: string, content: string) => {
    const text = (title + " " + content).toLowerCase();
    
    const positiveWords = [
      'surge', 'surged', 'rally', 'rallied', 'gain', 'gains', 'high', 'breakout', 'jump', 'jumped',
      'rise', 'rises', 'rose', 'up', 'bullish', 'strong', 'positive', 'boost', 'soar', 'soared',
      'hits new high', 'record high', 'all-time high', 'outperform', 'buy', 'upgrade', 'target',
      'growth', 'profit', 'beat', 'beats', 'exceed', 'expansion', 'partnership', 'deal'
    ];
    
    const negativeWords = [
      'fall', 'falls', 'fell', 'drop', 'dropped', 'decline', 'declined', 'crash', 'crashed',
      'bearish', 'weak', 'negative', 'loss', 'losses', 'low', 'bear', 'sell', 'downgrade',
      'concern', 'concerns', 'worry', 'worries', 'risk', 'risks', 'cut', 'cuts', 'miss',
      'misses', 'missed', 'disappoint', 'disappointing', 'slump', 'plunge', 'tumble'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  };







  const translateMutation = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest("POST", "/api/translate", { text, targetLanguage });
      return response.json();
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.content.substring(0, 100) + "...",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    },
  });

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleLanguageToggle = () => {
    if (onLanguageToggle) {
      onLanguageToggle();
    } else {
      // Fallback for individual toggle
      if (language === 'en') {
        setLanguage('hi');
      } else {
        setLanguage('en');
      }
    }
  };

  const priceChangeInfo = formatPriceChange(article.priceChange || "");

  // Process content to be continuous and fit on page
  const getFullContent = (content: string) => {
    // Remove markdown formatting and make content continuous
    const cleanContent = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\n\n/g, ' ') // Replace paragraph breaks with spaces
      .replace(/\n/g, ' ') // Replace line breaks with spaces
      .replace(/•\s*/g, '• ') // Normalize bullet points
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();

    return [{
      type: 'text' as const,
      content: cleanContent
    }];
  };

  const fullContent = getFullContent(article.content);

  return (
    <div
      className={cn(
        "absolute inset-0 bg-gradient-to-br from-background via-background to-background/95 text-foreground transition-transform duration-300 article-card overflow-hidden shadow-2xl border-l-4",
        getPriceChangeSentimentColor(),
        sentimentColorClass
      )}
      style={style}
    >
      <div className="h-full flex flex-col">
        {/* Article Image - 35% of screen */}
        <div className="relative h-[35vh] bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
          {!imageError && article.imageUrl && !article.imageUrl.includes('/icon-192.png') ? (
            <img
              src={`${article.imageUrl}?v=${imageKey}&_=${Date.now()}`}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              onError={() => {
                console.log('Image failed to load:', article.imageUrl);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', article.imageUrl);
              }}
              key={`img-${article.id}-${imageKey}`}
              loading="eager"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
              <TrendingUp className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Article Content - 65% of screen with scrolling */}
        <div className="flex-1 px-4 py-3 overflow-y-auto bg-gradient-to-b from-background to-background/95">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <h2 className={cn(
                "font-bold leading-tight text-foreground tracking-tight flex-1 text-left",
                language === 'hi' ? "text-left" : "text-left"
              )} style={{ fontSize: '24px', fontFamily: 'Arial, sans-serif' }}>
                {language === 'hi' && article.titleHi ? article.titleHi : article.title.replace(/🔒\s*/, '')}
              </h2>
              <button
                onClick={handleLanguageToggle}
                disabled={isTranslating}
                className={cn(
                  "flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 border-2",
                  language === 'hi' 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-500 shadow-lg shadow-blue-500/25" 
                    : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-500 shadow-lg shadow-orange-500/25 hover:bg-orange-200 dark:hover:bg-orange-800"
                )}
              >
                <Languages className={cn("w-3 h-3", language === 'hi' ? "text-blue-600" : "text-orange-600")} />
                <span className="font-semibold">{isTranslating ? "..." : language === 'hi' ? "EN" : "हिंदी"}</span>
              </button>
            </div>

            <div className={cn(
              "leading-relaxed text-foreground/90 whitespace-pre-line text-left",
              language === 'hi' ? "text-left" : "text-left"
            )} style={{ fontSize: '18px', fontFamily: 'Arial, sans-serif' }}>
              {language === 'hi' && article.contentHi 
                ? article.contentHi
                : article.content
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/•\s*/g, '• ')
                    .trim()}
            </div>
          </div>

          {/* Action Bar - Fixed at bottom */}
          <div className="mt-auto pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShare}
                  disabled={shareMutation.isPending}
                  className="flex items-center space-x-1 text-muted-foreground hover:text-neutral transition-all duration-300"
                >
                  <Share2 className="w-3 h-3" />
                  <span className="font-medium">Share</span>
                </button>
                {article.source && (
                  <div className="text-muted-foreground/60 bg-muted/20 px-2 py-0.5 rounded">
                    {article.source}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground/60">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(article.createdAt)}</span>
                </div>
                <div className="bg-muted/20 px-2 py-0.5 rounded">
                  Swipe up
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { ArticleCard };
