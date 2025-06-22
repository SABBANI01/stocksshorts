import { useEffect, useRef } from 'react';

interface PreloadOptions {
  priority?: boolean;
  delay?: number;
  maxConcurrent?: number;
}

export function useImagePreloader() {
  const preloadCache = useRef(new Set<string>());
  const loadingQueue = useRef(new Set<string>());

  const preloadImage = async (src: string, options: PreloadOptions = {}): Promise<void> => {
    const { priority = false, delay = 0 } = options;

    // Skip if already cached or loading
    if (preloadCache.current.has(src) || loadingQueue.current.has(src)) {
      return;
    }

    loadingQueue.current.add(src);

    // Add delay for non-priority images to prevent blocking
    if (!priority && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        preloadCache.current.add(src);
        loadingQueue.current.delete(src);
        resolve();
      };

      img.onerror = () => {
        loadingQueue.current.delete(src);
        reject(new Error(`Failed to preload: ${src}`));
      };

      // Start loading with optimized URL
      img.src = optimizeImageUrl(src);
    });
  };

  const preloadBatch = async (urls: string[], options: PreloadOptions = {}): Promise<void> => {
    const { maxConcurrent = 3 } = options;
    
    // Process in batches to avoid overwhelming the browser
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      
      await Promise.allSettled(
        batch.map((url, index) => 
          preloadImage(url, {
            ...options,
            priority: index === 0 && i === 0, // First image gets priority
            delay: options.delay ? options.delay * index : 0
          })
        )
      );
    }
  };

  const optimizeImageUrl = (url: string): string => {
    if (url.includes('pexels.com')) {
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?auto=compress&cs=tinysrgb&w=400&h=300&fm=webp&q=75`;
    }
    return url;
  };

  const isPreloaded = (src: string): boolean => {
    return preloadCache.current.has(src);
  };

  const clearCache = (): void => {
    preloadCache.current.clear();
    loadingQueue.current.clear();
  };

  const getCacheStats = () => {
    return {
      cached: preloadCache.current.size,
      loading: loadingQueue.current.size
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, []);

  return {
    preloadImage,
    preloadBatch,
    isPreloaded,
    clearCache,
    getCacheStats,
    optimizeImageUrl
  };
}

// Hook for intelligent preloading based on user behavior
export function useIntelligentPreloader(
  images: string[], 
  currentIndex: number, 
  options: PreloadOptions = {}
) {
  const { preloadBatch } = useImagePreloader();
  const lastIndex = useRef(currentIndex);
  const direction = useRef<'forward' | 'backward'>('forward');

  useEffect(() => {
    // Determine scroll direction
    if (currentIndex > lastIndex.current) {
      direction.current = 'forward';
    } else if (currentIndex < lastIndex.current) {
      direction.current = 'backward';
    }
    lastIndex.current = currentIndex;

    // Preload based on direction and position
    const preloadNext = async () => {
      const preloadCount = 3; // Number of images to preload ahead
      let imagesToPreload: string[] = [];

      if (direction.current === 'forward') {
        // Preload next images
        imagesToPreload = images.slice(currentIndex + 1, currentIndex + 1 + preloadCount);
      } else {
        // Preload previous images when going backward
        const start = Math.max(0, currentIndex - preloadCount);
        imagesToPreload = images.slice(start, currentIndex);
      }

      if (imagesToPreload.length > 0) {
        await preloadBatch(imagesToPreload, {
          ...options,
          delay: 100, // Small delay to not interfere with current loading
          maxConcurrent: 2
        });
      }
    };

    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadNext);
    } else {
      setTimeout(preloadNext, 50);
    }
  }, [currentIndex, images, preloadBatch, options]);
}