// Instagram-style image preloading system
class ImagePreloader {
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Set<string>();

  async preload(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadSingle(url));
    await Promise.allSettled(promises);
  }

  private preloadSingle(url: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url)!);
    }

    // Return existing promise if already loading
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (this.cache.has(url)) {
            resolve(this.cache.get(url)!);
          } else if (!this.loading.has(url)) {
            reject(new Error('Failed to load image'));
          } else {
            setTimeout(checkLoaded, 10);
          }
        };
        checkLoaded();
      });
    }

    this.loading.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        resolve(img);
      };

      img.onerror = () => {
        this.loading.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Start loading
      img.src = url;
    });
  }

  isLoaded(url: string): boolean {
    return this.cache.has(url);
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }
}

export const imagePreloader = new ImagePreloader();