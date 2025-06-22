import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSwipe } from "@/hooks/use-swipe";
import { CategoryFilters } from "@/components/category-filters";
import { ArticleCard } from "@/components/article-card";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useLanguage } from "@/contexts/language-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RefreshCw, Languages, Wifi, WifiOff } from "lucide-react";

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("trending");
  const [selectedSentiment, setSelectedSentiment] = useState("all");
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const containerRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage } = useLanguage();
  const queryClient = useQueryClient();

  // Super fast data fetching with auto-refresh
  const { data: allArticles = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/articles", selectedCategory],
    queryFn: async () => {
      const url = `/api/articles?category=${selectedCategory}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch articles');
      return res.json();
    },
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    cacheTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  // Filter articles by sentiment (applied after category filtering)
  const articles = useMemo(() => {
    // First filter by category (already done by the API call)
    let filteredArticles = allArticles;
    
    // Then filter by sentiment if not 'all'
    if (selectedSentiment !== 'all') {
      filteredArticles = allArticles.filter(article => {
        // Get sentiment from article sentiment field or price change
        let articleSentiment = 'neutral';
        
        // Use Column N sentiment values first
        if (article.sentiment && article.sentiment.trim() !== '') {
          const s = article.sentiment.toLowerCase().trim();
          if (s === 'bullish' || s === 'positive' || s === 'bull') articleSentiment = 'positive';
          else if (s === 'bearish' || s === 'negative' || s === 'bear') articleSentiment = 'negative';
          else if (s === 'neutral') articleSentiment = 'neutral';
        } else if (article.priceChange) {
          // Use price change to determine sentiment
          const cleanPrice = article.priceChange.replace(/[^\d.-]/g, '');
          const priceValue = parseFloat(cleanPrice);
          if (!isNaN(priceValue)) {
            if (priceValue > 0) articleSentiment = 'positive';
            else if (priceValue < 0) articleSentiment = 'negative';
          }
        }
        
        return articleSentiment === selectedSentiment;
      });
    }
    
    return filteredArticles;
  }, [allArticles, selectedSentiment]);

  // Track article views
  const trackViewMutation = useMutation({
    mutationFn: async (articleId: number) => {
      const response = await fetch(`/api/articles/${articleId}/view`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to track view');
      return response.json();
    },
  });

  // Instant translation mutation
  const translateMutation = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest("POST", "/api/translate-openai", { text, targetLanguage });
      if (!response.ok) {
        throw new Error("Translation failed");
      }
      const result = await response.json();
      return result;
    },
  });

  // Smart image preloading with optimization
  useEffect(() => {
    if (!articles.length) return;

    const preloadImages = async () => {
      // Only preload current and next 2 images for optimal performance
      const imagesToPreload = articles.slice(currentIndex, currentIndex + 3);
      
      imagesToPreload.forEach((article, idx) => {
        if (!preloadedImages.has(article.imageUrl)) {
          // Use optimized image URLs with WebP and compression
          const img = new Image();
          img.onload = () => {
            setPreloadedImages(prev => new Set([...prev, article.imageUrl]));
          };
          img.onerror = () => {
            console.warn(`Failed to preload image: ${article.imageUrl}`);
          };
          
          // Preload with high priority for current, low for next
          img.fetchPriority = idx === 0 ? "high" : "low";
          img.loading = "lazy";
          img.src = article.imageUrl;
        }
      });
    };

    // Use requestIdleCallback for non-blocking preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadImages);
    } else {
      setTimeout(preloadImages, 0);
    }
  }, [articles, currentIndex, preloadedImages]);

  // Lightning-fast Hindi translation toggle
  const handleLanguageToggle = async () => {
    if (language === 'en') {
      setLanguage('hi');
      
      // Only translate current article for instant response
      const currentArticle = articles[currentIndex];
      if (currentArticle && !currentArticle.titleHi) {
        try {
          const [titleResult, contentResult] = await Promise.all([
            translateMutation.mutateAsync({
              text: currentArticle.title,
              targetLanguage: "hindi"
            }),
            translateMutation.mutateAsync({
              text: currentArticle.content.substring(0, 200), // Shorter for speed
              targetLanguage: "hindi"
            })
          ]);

          // Update article in place
          currentArticle.titleHi = titleResult.translatedText;
          currentArticle.contentHi = contentResult.translatedText;
          
          // Force re-render
          queryClient.invalidateQueries(["/api/articles"]);
        } catch (error) {
          console.error("Translation failed:", error);
        }
      }
    } else {
      setLanguage('en');
    }
  };

  // Instagram-like swipe navigation with momentum
  const swipeHandlers = useSwipe({
    onSwipeUp: () => {
      if (currentIndex < articles.length - 1) {
        setIsSwiping(true);
        const newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        
        // Track view for the new article
        if (articles[newIndex]) {
          trackViewMutation.mutate(articles[newIndex].id);
        }
        
        setTimeout(() => setIsSwiping(false), 100);
      }
    },
    onSwipeDown: () => {
      if (currentIndex > 0) {
        setIsSwiping(true);
        const newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        
        // Track view for the previous article
        if (articles[newIndex]) {
          trackViewMutation.mutate(articles[newIndex].id);
        }
        
        setTimeout(() => setIsSwiping(false), 100);
      }
    },
    threshold: 30 // Lower threshold for more responsive swiping
  });

  // Virtual scrolling - only render visible cards
  const visibleArticles = useMemo(() => {
    if (!articles.length) return [];
    
    // Only render current card and immediate neighbors for maximum performance
    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(articles.length, currentIndex + 2);
    
    return articles.slice(start, end).map((article, idx) => ({
      ...article,
      virtualIndex: start + idx
    }));
  }, [articles, currentIndex]);

  // Reset index on category or sentiment change and track first article view
  useEffect(() => {
    setCurrentIndex(0);
    if (articles.length > 0) {
      // Track view for the first article when filters change
      trackViewMutation.mutate(articles[0].id);
    }
  }, [selectedCategory, selectedSentiment, articles]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update last refresh time when data changes
  useEffect(() => {
    if (articles.length > 0) {
      setLastUpdate(new Date());
    }
  }, [articles]);

  // Auto-refresh notification
  const getRefreshStatus = () => {
    if (!lastUpdate) return "Loading...";
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just updated";
    if (diffMinutes === 1) return "Updated 1 min ago";
    return `Updated ${diffMinutes} mins ago`;
  };

  if (isLoading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header skeleton */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Content skeleton */}
        <main className="pt-20 h-screen overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Image skeleton - 60% */}
            <div className="h-[60%] bg-gray-200 dark:bg-gray-700 animate-pulse relative">
              <div className="absolute top-4 left-4 h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="absolute top-4 right-4 h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="absolute bottom-4 left-4 h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
            
            {/* Text skeleton - 40% */}
            <div className="h-[40%] p-6 space-y-4">
              <div className="space-y-2 text-justify">
                <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-6 w-4/5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2 text-justify">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with super minimal design */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-3">
            <h1 className="text-lg font-bold">StocksShorts</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLanguageToggle}
              className="flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              {language === 'en' ? 'हिंदी' : 'English'}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{getRefreshStatus()}</span>
              </Button>
              {!isOnline && (
                <WifiOff className="w-4 h-4 text-red-500" title="Offline" />
              )}
              {isOnline && (
                <Wifi className="w-4 h-4 text-green-500" title="Online" />
              )}
            </div>
          </div>
          
          {/* Category filters in dedicated section */}
          <CategoryFilters 
            selectedCategory={selectedCategory}
            onCategoryChange={(category) => {
              setSelectedCategory(category);
              setSelectedSentiment("all"); // Reset sentiment when category changes
            }}
            selectedSentiment={selectedSentiment}
            onSentimentChange={setSelectedSentiment}
          />
        </div>
      </header>

      {/* Main content with Instagram-like scrolling */}
      <main 
        ref={containerRef}
        className="pt-24 h-screen overflow-hidden relative"
        {...swipeHandlers}
      >
        <div className="relative h-full">
          {visibleArticles.map((article) => {
            const offset = article.virtualIndex - currentIndex;
            return (
              <ArticleCard
                key={article.id}
                article={article}
                isActive={article.virtualIndex === currentIndex}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  transform: `translateY(${offset * 100}%)`,
                  transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  zIndex: article.virtualIndex === currentIndex ? 10 : 1,
                }}
                onLanguageToggle={handleLanguageToggle}
              />
            );
          })}
        </div>

        {/* Progress indicator with refresh status */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 space-y-2">
          <div className="bg-black/20 rounded-full px-3 py-1 text-white text-sm text-center">
            {currentIndex + 1} / {articles.length}
          </div>
          {!isOnline && (
            <div className="bg-red-500/90 rounded-full px-3 py-1 text-white text-xs text-center">
              Offline - Showing cached articles
            </div>
          )}
        </div>
      </main>
    </div>
  );
}