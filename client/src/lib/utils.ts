import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPriceChange(change: string): { color: string; icon: string } {
  if (change.startsWith('+')) {
    return { color: 'text-bull', icon: '↗' };
  } else if (change.startsWith('-')) {
    return { color: 'text-bear', icon: '↘' };
  }
  return { color: 'text-neutral', icon: '→' };
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'nifty':
      return '📊';
    case 'breakout':
      return '📈';
    case 'movers':
      return '🚀';
    case 'order_wins':
      return '🎯';
    case 'warrant':
      return '⚠️';
    case 'ath':
      return '🏆';
    case 'results':
      return '📋';
    case 'others':
      return '📰';
    default:
      return '📰';
  }
}

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'global':
      return 'bg-violet-500';
    case 'trending':
      return 'bg-red-500';
    case 'nifty':
      return 'bg-blue-500';
    case 'breakout':
      return 'bg-green-500';
    case 'research_report':
      return 'bg-purple-500';
    case 'movers':
      return 'bg-orange-500';
    case 'order_wins':
      return 'bg-yellow-500';
    case 'warrant':
      return 'bg-pink-500';
    case 'results':
      return 'bg-indigo-500';
    case 'ipo':
      return 'bg-cyan-500';
    case 'sme ipo':
      return 'bg-emerald-500';
    case 'others':
      return 'bg-gray-500';
    default:
      return 'bg-muted';
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'nifty':
      return 'NIFTY UPDATE';
    case 'breakout':
      return 'BREAKOUT';
    case 'movers':
      return 'MOVERS';
    case 'order_wins':
      return 'TOP ORDER WINS';
    case 'warrant':
      return 'WARRANT ISSUE';
    case 'ath':
      return 'ALL-TIME HIGH';
    case 'results':
      return 'RESULTS';
    case 'others':
      return 'OTHERS';
    default:
      return 'NEWS';
  }
}
