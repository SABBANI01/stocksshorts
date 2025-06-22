import { cn } from "@/lib/utils";
import { TrendingUp, FileText, Building2, Trophy, Target, Award, Zap, PlusCircle, Briefcase, MoreHorizontal } from "lucide-react";

interface CategoryFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedSentiment?: string;
  onSentimentChange?: (sentiment: string) => void;
}

const categories = [
  { id: "global", label: "Global", icon: TrendingUp },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "nifty", label: "Nifty", icon: TrendingUp },
  { id: "breakout", label: "Breakout Stocks", icon: Zap },
  { id: "research_report", label: "Research Report", icon: FileText },
  { id: "movers", label: "Most Active", icon: Target },
  { id: "order_wins", label: "Order Wins", icon: Trophy },
  { id: "warrant", label: "Warrants", icon: Award },
  { id: "results", label: "Results", icon: Briefcase },
  { id: "ipo", label: "IPO", icon: PlusCircle },
  { id: "sme ipo", label: "SME IPO", icon: Building2 },
  { id: "others", label: "Others", icon: MoreHorizontal },
];

export function CategoryFilters({ selectedCategory, onCategoryChange, selectedSentiment, onSentimentChange }: CategoryFiltersProps) {
  const sentiments = [
    { id: 'all', label: 'All', color: 'bg-gray-500' },
    { id: 'positive', label: 'Bullish', color: 'bg-green-500' },
    { id: 'negative', label: 'Bearish', color: 'bg-red-500' },
    { id: 'neutral', label: 'Neutral', color: 'bg-gray-400' }
  ];

  return (
    <div className="bg-background">
      {/* Category Filters - Two rows layout with smaller icons */}
      <div className="grid grid-cols-6 gap-1 px-2 pb-1">
        {categories.slice(0, 6).map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "px-0.5 py-1.5 rounded-md text-[8px] font-medium transition-all duration-200 flex flex-col items-center justify-center gap-0.5 min-h-[36px]",
                selectedCategory === category.id
                  ? "bg-green-500 text-white shadow-md border border-green-500"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              )}
            >
              <IconComponent size={8} />
              <span className="text-center leading-[1.1] break-words px-0.5">{category.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Second row */}
      <div className="grid grid-cols-6 gap-1 px-2 pb-1">
        {categories.slice(6).map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "px-0.5 py-1.5 rounded-md text-[8px] font-medium transition-all duration-200 flex flex-col items-center justify-center gap-0.5 min-h-[36px]",
                selectedCategory === category.id
                  ? "bg-green-500 text-white shadow-md border border-green-500"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
              )}
            >
              <IconComponent size={8} />
              <span className="text-center leading-[1.1] break-words px-0.5">{category.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Sentiment Filters */}
      {onSentimentChange && (
        <div className="flex gap-2 px-2 pb-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 self-center mr-1">Sentiment:</span>
          {sentiments.map((sentiment) => (
            <button
              key={sentiment.id}
              onClick={() => onSentimentChange(sentiment.id)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200",
                selectedSentiment === sentiment.id
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", sentiment.color)} />
              {sentiment.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
