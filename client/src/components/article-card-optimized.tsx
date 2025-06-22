import { useState, useEffect, memo } from "react";
import { Clock, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { cn, getCategoryColor } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { LoadingSkeleton } from "./loading-skeleton";
import { OptimizedImage } from "./optimized-image";
import type { Article } from "@shared/schema";

interface ArticleCardProps {
  article: Article;
  isActive: boolean;
  style?: React.CSSProperties;
  onLanguageToggle?: () => void;
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const articleDate = new Date(dateString);
  const diffInMs = now.getTime() - articleDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  return articleDate.toLocaleDateString();
}

const ArticleCard = memo(function ArticleCard({ article, isActive, style, onLanguageToggle }: ArticleCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { language } = useLanguage();

  // Preload image when component mounts
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = article.imageUrl;
  }, [article.imageUrl]);

  // Get sentiment from price change
  const getSentiment = () => {
    if (!article.priceChange) return 'neutral';
    const priceValue = parseFloat(article.priceChange.replace(/[^\d.-]/g, ''));
    return priceValue > 0 ? 'positive' : priceValue < 0 ? 'negative' : 'neutral';
  };

  const sentiment = getSentiment();
  const sentimentColor = sentiment === 'positive' ? 'text-green-600' : 
                        sentiment === 'negative' ? 'text-red-600' : 'text-white';

  const title = language === 'hi' && article.titleHi ? article.titleHi : article.title;
  const content = language === 'hi' && article.contentHi ? article.contentHi : article.content;

  // Show skeleton while image is loading
  if (!imageLoaded && !imageError) {
    return (
      <div style={style} className="w-full h-full">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div style={style} className="w-full h-full bg-background">
      <div className="h-full flex flex-col">
        {/* Image section - 60% of screen like Inshorts */}
        <div className="relative h-[60%] overflow-hidden bg-gray-100">
          <OptimizedImage
            src={article.imageUrl}
            alt={title}
            isActive={isActive}
            priority={isActive}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          


          {/* Price change indicator */}
          {article.priceChange && (
            <div className="absolute top-4 right-4">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 text-white text-sm font-medium"
              )}>
                {sentiment === 'positive' ? <TrendingUp className="w-3 h-3 text-green-600" /> : 
                 sentiment === 'negative' ? <TrendingDown className="w-3 h-3 text-red-600" /> : null}
                <span className={sentiment === 'neutral' ? 'text-white' : sentimentColor}>{article.priceChange}</span>
              </div>
            </div>
          )}

          {/* Time overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/90 text-sm">
            <Clock className="w-4 h-4" />
            <span>{getTimeAgo(article.createdAt)}</span>
          </div>
        </div>

        {/* Content section - 40% of screen */}
        <div className="h-[40%] p-6 flex flex-col justify-between overflow-hidden">
          {/* Title */}
          <div>
            <h2 className={cn(
              "font-bold mb-4 leading-tight line-clamp-3 text-left",
              language === 'hi' ? "text-left" : "text-left"
            )} style={{ fontSize: '34px', fontFamily: 'Arial, sans-serif' }}>
              {title}
            </h2>
            
            {/* Content preview */}
            <p className={cn(
              "text-muted-foreground leading-relaxed line-clamp-5 text-left font-medium",
              language === 'hi' ? "text-left" : "text-left"
            )} style={{ fontSize: '28px', fontFamily: 'Arial, sans-serif' }}>
              {content.length > 320 ? content.substring(0, 320) + '...' : content}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>
            
            {/* Swipe indicator */}
            <div className="text-xs text-muted-foreground">
              Swipe up for next story
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { ArticleCard };