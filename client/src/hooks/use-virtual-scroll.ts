import { useMemo } from 'react';

export function useVirtualScroll(items: any[], currentIndex: number, windowSize = 3) {
  return useMemo(() => {
    const start = Math.max(0, currentIndex - Math.floor(windowSize / 2));
    const end = Math.min(items.length, start + windowSize);
    
    return {
      visibleItems: items.slice(start, end),
      startIndex: start,
      endIndex: end
    };
  }, [items, currentIndex, windowSize]);
}