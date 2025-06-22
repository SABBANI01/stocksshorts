import { memo } from "react";

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="w-full h-full bg-background animate-pulse">
      <div className="h-full flex flex-col">
        {/* Image skeleton - 60% of screen */}
        <div className="relative h-[60%] bg-gray-200 dark:bg-gray-700">
          {/* Category badge skeleton */}
          <div className="absolute top-4 left-4">
            <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          
          {/* Price change skeleton */}
          <div className="absolute top-4 right-4">
            <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
          
          {/* Time skeleton */}
          <div className="absolute bottom-4 left-4">
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>

        {/* Content skeleton - 40% of screen */}
        <div className="h-[40%] p-6 flex flex-col justify-between">
          {/* Title skeleton */}
          <div className="space-y-2">
            <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-6 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-2 mt-3 text-justify">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>

          {/* Action buttons skeleton */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

export { LoadingSkeleton };