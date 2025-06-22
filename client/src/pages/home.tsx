import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, RefreshCw, ChevronUp, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { CategoryFilters } from "@/components/category-filters";
import { ArticleCard } from "@/components/article-card";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { InstallPrompt } from "@/components/install-prompt";
import { useSwipe } from "@/hooks/use-swipe";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Article } from "@shared/schema";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newArticlesCount, setNewArticlesCount] = useState(0);
  const [showNewArticlesNotification, setShowNewArticlesNotification] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionTriggerType, setSubscriptionTriggerType] = useState<'warrant' | 'breakout' | 'general'>('general');
  const previousArticleCountRef = useRef<number>(0);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, isTranslating, setIsTranslating } = useLanguage();
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading, error, refetch } = useQuery<Article[]>({
    queryKey: ["/api/articles", selectedCategory],
    queryFn: async () => {
      try {
        const url = selectedCategory === "all" 
          ? "/api/articles" 
          : `/api/articles?category=${selectedCategory}`;
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Failed to fetch articles:', err);
        throw err;
      }
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    retry: 3
  });

  const translateMutation = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      console.log(`Frontend translating: "${text}" to ${targetLanguage}`);
      
      const response = await apiRequest("POST", "/api/translate-openai", { text, targetLanguage });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Translation API error:", errorData);
        throw new Error(errorData.message || "Translation failed");
      }
      
      const result = await response.json();
      console.log("Translation result:", result);
      return result;
    },
  });

  // OpenAI translation - fast and accurate
  const handleGlobalLanguageToggle = async () => {
    if (language === 'en') {
      setIsTranslating(true);
      setLanguage('hi');
      
      // Get current articles that need translation
      const articlesNeedingTranslation = articles.filter(article => !article.titleHi || !article.contentHi);
      
      if (articlesNeedingTranslation.length > 0) {
        try {
          // Translate only the current visible article for instant performance
          const currentArticle = articles[currentIndex];
          if (currentArticle && (!currentArticle.titleHi || !currentArticle.contentHi)) {
            const [titleResult, contentResult] = await Promise.all([
              translateMutation.mutateAsync({
                text: currentArticle.title,
                targetLanguage: "hindi"
              }),
              translateMutation.mutateAsync({
                text: currentArticle.content.substring(0, 150), // Shorter content for faster translation
                targetLanguage: "hindi"
              })
            ]);
            
            // Update current article in place
            currentArticle.titleHi = titleResult.translatedText;
            currentArticle.contentHi = contentResult.translatedText;
          }
          
          // Update cache immediately
          queryClient.setQueryData(["/api/articles", selectedCategory], (oldData: Article[]) => {
            return oldData.map(article => {
              const translated = translatedArticles.find(t => t.id === article.id);
              return translated || article;
            });
          });
          
        } catch (error) {
          console.error("OpenAI translation failed:", error);
        }
      }
      
      setIsTranslating(false);
    } else {
      setLanguage('en');
    }
  };

  // Compact translation dictionary for essential financial terms only
  const getInstantTranslation = (text: string): string => {
    const translationDict: {[key: string]: string} = {
      'Nifty': 'निफ्टी',
      'Sensex': 'सेंसेक्स',
      'Bank Nifty': 'बैंक निफ्टी',
      'market': 'बाजार',
      'index': 'सूचकांक',
      'stocks': 'स्टॉक्स',
      'shares': 'शेयर्स',
      'trading': 'ट्रेडिंग',
      'profit': 'मुनाफा',
      'loss': 'नुकसान',
      'gain': 'बढ़त',
      'rise': 'बढ़ोतरी',
      'fall': 'गिरावट',
      'high': 'ऊंचाई',
      'low': 'निचला',
      'rally': 'रैली',
      'surge': 'उछाल',
      'company': 'कंपनी',
      'crore': 'करोड़',
      'lakh': 'लाख',
      'rupee': 'रुपया',
      'targets': 'लक्ष्य',
      'beats': 'बेहतर',
      'strong': 'मजबूत',
      'weak': 'कमजोर',
      'bullish': 'तेजी',
      'bearish': 'मंदी',
      'positive': 'सकारात्मक',
      'negative': 'नकारात्मक'
    };

    // Split text into words and translate each word
    const words = text.split(' ');
    const translatedWords = words.map(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      return translationDict[cleanWord] || word;
    });
    
    return translatedWords.join(' ');
  };

  // Filter articles by sentiment
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

  const filteredArticles = articles
    .filter(article => {
      if (sentimentFilter === 'all') return true;
      return getSentiment(article.title, article.content) === sentimentFilter;
    })
    .sort((a, b) => b.id - a.id);

  const totalArticles = filteredArticles.length;

  // Reset current index when category changes only
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory, sentimentFilter]);

  // Auto-refresh functionality
  useEffect(() => {
    const startAutoRefresh = () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      
      autoRefreshIntervalRef.current = setInterval(async () => {
        await refetch();
      }, 30 * 60 * 1000); // Refresh every 30 minutes for better performance
    };

    startAutoRefresh();

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [refetch]);

  // Track article count changes for notifications
  useEffect(() => {
    if (articles.length > 0) {
      const currentCount = articles.length;
      const previousCount = previousArticleCountRef.current;

      if (previousCount > 0 && currentCount > previousCount && isScrolling) {
        const newCount = currentCount - previousCount;
        setNewArticlesCount(newCount);
        setShowNewArticlesNotification(true);
      }

      previousArticleCountRef.current = currentCount;
    }
  }, [articles, isScrolling]);

  // Track navigation state (since we use swipe instead of scroll)
  useEffect(() => {
    if (currentIndex > 0) {
      setIsScrolling(true);
      const timer = setTimeout(() => setIsScrolling(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Listen for subscription dialog triggers
  useEffect(() => {
    const handleSubscriptionTrigger = (event: CustomEvent) => {
      const type = event.detail?.type;
      setSubscriptionTriggerType(type === 'warrant' || type === 'breakout' ? type : 'general');
      setSubscriptionDialogOpen(true);
    };

    window.addEventListener('openSubscription', handleSubscriptionTrigger as EventListener);
    return () => {
      window.removeEventListener('openSubscription', handleSubscriptionTrigger as EventListener);
    };
  }, []);

  const navigateToArticle = (index: number) => {
    if (index >= 0 && index < totalArticles) {
      setCurrentIndex(index);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleGoToTop = () => {
    setCurrentIndex(0);
    setShowNewArticlesNotification(false);
    setNewArticlesCount(0);
  };

  const handleAddTestArticle = async () => {
    try {
      await fetch('/api/articles/test', { method: 'POST' });
      // Simulate user scrolling to trigger notification
      setIsScrolling(true);
      setTimeout(() => setIsScrolling(false), 2000);
    } catch (error) {
      console.error('Failed to add test article:', error);
    }
  };

  const { elementRef } = useSwipe({
    onSwipeUp: () => navigateToArticle(currentIndex + 1),
    onSwipeDown: () => navigateToArticle(currentIndex - 1),
    onSwipeLeft: handleRefresh,
    threshold: 50,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateToArticle(currentIndex + 1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateToArticle(currentIndex - 1);
      } else if (e.key === " ") {
        e.preventDefault();
        navigateToArticle(currentIndex + 1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalArticles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-bull" />
          <p className="text-muted-foreground">Loading StocksShorts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-background via-background to-background/95 dark:from-background dark:via-background dark:to-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <div>
              <h1 className="text-xl font-bold text-green-600 dark:text-green-400">
                StocksShorts
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">Real-time Stock News</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Sentiment Filter Icons */}
            <button
              onClick={() => setSentimentFilter('positive')}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 hover:scale-105 group",
                sentimentFilter === 'positive' 
                  ? "bg-green-500/20 text-green-600" 
                  : "hover:bg-green-500/10 text-green-600/70"
              )}
              title="Positive News"
            >
              <TrendingUp className="h-4 w-4 group-hover:text-green-500" />
            </button>
            
            <button
              onClick={() => setSentimentFilter('negative')}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 hover:scale-105 group",
                sentimentFilter === 'negative' 
                  ? "bg-red-500/20 text-red-600" 
                  : "hover:bg-red-500/10 text-red-600/70"
              )}
              title="Negative News"
            >
              <TrendingDown className="h-4 w-4 group-hover:text-red-500" />
            </button>
            
            <button
              onClick={() => setSentimentFilter('neutral')}
              className={cn(
                "p-2 rounded-lg transition-all duration-300 hover:scale-105 group",
                sentimentFilter === 'neutral' 
                  ? "bg-gray-500/20 text-gray-600" 
                  : "hover:bg-gray-500/10 text-gray-600/70"
              )}
              title="Neutral News"
            >
              <Minus className="h-4 w-4 group-hover:text-gray-500" />
            </button>
            
            <button
              className="p-2 rounded-lg hover:bg-blue-500/10 transition-all duration-300 hover:scale-105 group"
              title="Install App"
              onClick={() => alert('Use browser menu: Share → Add to Home Screen')}
            >
              <Download className="h-4 w-4 text-blue-600 group-hover:text-blue-500" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/80 transition-all duration-300 hover:scale-105 shadow-sm"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <CategoryFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>
      </header>

      {/* Pull to Refresh Indicator */}
      <div
        className={cn(
          "fixed top-20 left-1/2 transform -translate-x-1/2 z-40 transition-opacity duration-300",
          isRefreshing ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="bg-bull text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Refreshing...</span>
        </div>
      </div>

      {/* Install App Prompt */}
      <InstallPrompt />

      {/* New Articles Notification */}
      {showNewArticlesNotification && (
        <div
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 animate-in slide-in-from-top-2"
          onClick={handleGoToTop}
        >
          <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full text-sm font-semibold flex items-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20">
            <ChevronUp className="w-4 h-4" />
            <span>{newArticlesCount} new article{newArticlesCount > 1 ? 's' : ''}</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-32 h-screen overflow-hidden">
        <div ref={elementRef} className="relative h-full">
          {filteredArticles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-lg mb-2">No articles found</p>
                <p className="text-muted-foreground text-sm">
                  Try selecting a different category or sentiment filter
                </p>
              </div>
            </div>
          ) : (
            filteredArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                isActive={index === currentIndex}
                onLanguageToggle={handleGlobalLanguageToggle}
                style={{
                  transform: `translateY(${(index - currentIndex) * 100}%)`,
                  zIndex: index === currentIndex ? 1 : 0,
                }}
              />
            ))
          )}
        </div>
      </main>

      <SubscriptionDialog
        isOpen={subscriptionDialogOpen}
        onClose={() => setSubscriptionDialogOpen(false)}
        triggerType={subscriptionTriggerType}
      />
    </div>
  );
}
