// Image optimization utilities for lazy loading and performance

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  blur?: boolean;
}

export class ImageOptimizer {
  private cache = new Map<string, HTMLImageElement>();
  private loadingQueue = new Set<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src && !img.src) {
              this.loadImage(src).then((optimizedSrc) => {
                img.src = optimizedSrc;
                img.classList.remove('lazy-loading');
                img.classList.add('lazy-loaded');
              });
              this.observer?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );
  }

  optimizeUrl(url: string, options: ImageOptions = {}): string {
    const {
      width = 400,
      height = 300,
      quality = 75,
      format = 'webp'
    } = options;

    // If it's a Pexels URL, add optimization parameters
    if (url.includes('pexels.com')) {
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?auto=compress&cs=tinysrgb&w=${width}&h=${height}&fm=${format}&q=${quality}`;
    }

    // For other URLs, return as-is or add generic CDN parameters
    return url;
  }

  async preloadImage(url: string, options: ImageOptions = {}): Promise<string> {
    const optimizedUrl = this.optimizeUrl(url, options);
    
    if (this.cache.has(optimizedUrl)) {
      return optimizedUrl;
    }

    if (this.loadingQueue.has(optimizedUrl)) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (this.cache.has(optimizedUrl)) {
            resolve(optimizedUrl);
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
      });
    }

    return this.loadImage(optimizedUrl);
  }

  private async loadImage(url: string): Promise<string> {
    if (this.cache.has(url)) {
      return url;
    }

    this.loadingQueue.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(url, img);
        this.loadingQueue.delete(url);
        resolve(url);
      };

      img.onerror = () => {
        this.loadingQueue.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Start loading
      img.src = url;
    });
  }

  observeImage(img: HTMLImageElement) {
    if (this.observer) {
      this.observer.observe(img);
    }
  }

  async preloadBatch(urls: string[], options: ImageOptions = {}): Promise<void> {
    // Load images in batches of 3 to avoid overwhelming the browser
    const batchSize = 3;
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(url => this.preloadImage(url, options))
      );
      
      // Small delay between batches to maintain smooth scrolling
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  getBlurDataUrl(width: number = 10, height: number = 10): string {
    // Generate a tiny blurred placeholder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f3f4f6');
      gradient.addColorStop(1, '#e5e7eb');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL('image/jpeg', 0.1);
  }

  clearCache() {
    this.cache.clear();
    this.loadingQueue.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Global instance
export const imageOptimizer = new ImageOptimizer();