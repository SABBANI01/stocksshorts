import type { Article, Bookmark, InsertArticle, InsertBookmark } from "@shared/schema";
import { getArticleImage } from "./image-logic";

export interface IStorage {
  getArticles(category?: string): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  getBookmarks(): Promise<Bookmark[]>;
  addBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  removeBookmark(articleId: number): Promise<void>;
  isBookmarked(articleId: number): Promise<boolean>;
  addTestArticle(): Promise<Article>;
  forceSyncFromGoogleSheets(): Promise<void>;
  incrementViewCount(articleId: number): Promise<void>;
  getTrendingArticles(): Promise<Article[]>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private bookmarks: Map<number, Bookmark>;
  private currentArticleId: number;
  private currentBookmarkId: number;
  private googleSheets: GoogleSheetsService | null = null;
  private lastSyncTime: number = 0;
  private syncInterval: number = 2 * 60 * 1000; // 2 minutes for fresh data

  constructor() {
    this.articles = new Map();
    this.bookmarks = new Map();
    this.currentArticleId = 1;
    this.currentBookmarkId = 1;
    this.initializeGoogleSheets();
    // Only initialize with sample data if Google Sheets is not available
    this.initializeWithSampleDataIfNeeded();
  }

  private async initializeGoogleSheets() {
    try {
      // Import dynamically to avoid build issues
      const { GoogleSheetsService } = await import('./google-sheets');
      this.googleSheets = GoogleSheetsService.createFromEnv();
      
      if (this.googleSheets) {
        console.log('Google Sheets integration enabled');
      } else {
        console.log('Google Sheets integration disabled - missing credentials');
      }
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
    }
  }

  private async initializeWithSampleDataIfNeeded() {
    // Wait a bit for Google Sheets to initialize
    setTimeout(async () => {
      if (!this.googleSheets) {
        this.initializeData();
      } else {
        // Try to sync from Google Sheets first
        await this.syncFromGoogleSheets();
        // If no articles were loaded, use sample data as fallback
        if (this.articles.size === 0) {
          this.initializeData();
        }
      }
    }, 1000);
  }

  private async syncFromGoogleSheets(): Promise<void> {
    if (!this.googleSheets) return;
    
    try {
      console.log('Syncing articles from Google Sheets...');
      const sheetsArticles = await this.googleSheets.fetchArticles();
      
      if (sheetsArticles.length > 0) {
        // Clear existing articles and add new ones from sheets
        this.articles.clear();
        this.currentArticleId = 1;
        
        sheetsArticles.forEach((article, index) => {
          // Check for duplicate content and generate unique content
          const isDuplicateContent = index > 0 && sheetsArticles.some((otherArticle, otherIndex) => 
            otherIndex < index && otherArticle.content === article.content && article.content.trim() !== ''
          );
          
          if (!article.content || article.content.trim() === '' || isDuplicateContent) {
            // Generate unique content based on article details
            const uniqueContent = this.generateUniqueArticleContent(article.title, article.category, article.stockSymbol, article.stockPrice, article.priceChange, index);
            article.content = uniqueContent;
          }
          
          // Preserve existing view count if article already exists
          const existingArticle = this.articles.get(article.id);
          if (existingArticle) {
            article.viewCount = existingArticle.viewCount || 0;
          } else {
            article.viewCount = 0;
          }
          
          this.articles.set(article.id, article);
          if (article.id >= this.currentArticleId) {
            this.currentArticleId = article.id + 1;
          }
          
          // Debug log for first few articles
          if (index < 5) {
            console.log(`Article ${article.id}: "${article.title}" - Views: ${article.viewCount}`);
          }
        });
        
        this.lastSyncTime = Date.now();
        console.log(`Synced ${sheetsArticles.length} articles from Google Sheets`);
      } else {
        console.log('No articles found in Google Sheets');
      }
    } catch (error) {
      console.error('Failed to sync from Google Sheets:', error);
    }
  }

  async forceSyncFromGoogleSheets(): Promise<void> {
    this.lastSyncTime = 0; // Force sync
    await this.syncFromGoogleSheets();
  }

  private initializeData() {
    console.log('Initializing storage with articles...');
    
    // Add articles directly to storage
    this.articles.set(1, {
      id: 1,
      title: "Nifty Hits Record High of 23,500 Points",
      content: "The Nifty 50 index surged to a new all-time high of 23,500 points today, driven by strong buying in banking and IT stocks. Market experts attribute this rally to positive global cues and sustained FII inflows. Banking stocks led with 2.5% gains while IT sector posted strong 2.2% recovery. FII inflows of ₹2,800 crores were recorded today. The benchmark index has gained over 12% this year with consistent institutional support. Technical analysts see further upside with next resistance at 24,000 levels.",
      category: "market",
      stockSymbol: "NIFTY",
      stockPrice: "23,500",
      priceChange: "+1.8%",
      exchange: "NSE",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop",
      timeAgo: "5 minutes ago",
      isPremium: false,
      createdAt: new Date(),
      source: null,
      sentiment: null
    });

    this.articles.set(2, {
      id: 2,
      title: "HDFC Bank Call Warrants Show Strong Activity - Analysis",
      content: "HDFC Bank call warrants are showing unprecedented activity with volumes up 340% today. Our warrant analysis reveals key strike prices and expiry strategies. 1850 CE showing highest OI buildup while implied volatility at 18-month highs. Risk-reward ratio favoring bulls above 1820 with time decay acceleration post-earnings. Institutional flow analysis indicates sustained buying. The warrants provide good leverage opportunity for traders looking to capitalize on HDFC Bank's upward momentum.",
      category: "warrant",
      stockSymbol: "HDFCBANK",
      stockPrice: "1,845.30",
      priceChange: "+2.8%",
      exchange: "NSE",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop",
      timeAgo: "1 hour ago",
      isPremium: false,
      createdAt: new Date(),
      source: null,
      sentiment: null
    });

    this.articles.set(3, {
      id: 3,
      title: "Technical Breakout: Small-Cap Pharma Stock Ready for 40% Rally",
      content: "Our technical analysis has identified a small-cap pharmaceutical stock showing classic breakout patterns with volume confirmation. Breaking out of 18-month consolidation range with volume surge of 280% above 20-day average. RSI showing bullish divergence while moving average convergence confirms momentum. Fibonacci retracement levels provide clear targets. This breakout analysis includes entry/exit strategies and risk management guidelines for traders looking to capitalize on technical momentum.",
      category: "breakout",
      stockSymbol: "SMALLPHARMA",
      stockPrice: "188.45",
      priceChange: "+7.2%",
      exchange: "NSE",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
      timeAgo: "30 minutes ago",
      isPremium: false,
      createdAt: new Date()
    });

    this.articles.set(4, {
      id: 4,
      title: "Tech Mahindra Beats Q3 Estimates, Shares Jump 8%",
      content: "Tech Mahindra reported strong Q3 results with revenue growth of 12% YoY, beating analyst estimates. The company's digital transformation business grew 25% during the quarter.\n\n**Key Financial Highlights:**\n• Revenue: ₹13,101 crores (vs est. ₹12,800 crores)\n• Net profit: ₹1,285 crores (up 15% YoY)\n• EBITDA margin: 14.2% (improvement of 180 bps)\n• Dollar revenue growth: 8.5% YoY\n• Total Contract Value (TCV) wins: $1.2 billion\n\nThe company has seen strong demand in cloud migration, cybersecurity, and AI/ML services. Management has raised FY24 guidance, expecting 10-12% revenue growth.",
      category: "technology",
      stockSymbol: "TECHM",
      stockPrice: "1,245.80",
      priceChange: "+8.2%",
      exchange: "NSE",
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
      timeAgo: "2 hours ago",
      isPremium: false,
      createdAt: new Date(),
      source: null,
      sentiment: null
    });

    this.currentArticleId = 5;

    const sampleArticles: InsertArticle[] = [
      // Nifty News
      {
        title: "Nifty Hits 23,500 for First Time",
        content: `The Nifty 50 surged to a new all-time high of 23,500, driven by gains in banking and IT stocks. Strong FII inflows and global cues supported the rally. **Key Highlights:** • New all-time high: 23,500 • Banking & IT stocks led gains • Strong FII inflows continued • Global market sentiment positive. The index has gained over 12% this year, with consistent buying from domestic institutions and foreign investors. Technical analysts expect further upside with next resistance at 24,000 levels. Market breadth remained strong with 8 out of 10 sectors closing in green, indicating broad-based participation in the rally.`,
        category: "nifty",
        stockSymbol: "NIFTY 50",
        stockPrice: "23,500",
        priceChange: "+1.2%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 minute ago"
      },
      {
        title: "Bank Nifty Outperforms, Gains 1.8%",
        content: `Bank Nifty climbed nearly 2% today, led by HDFC Bank and Kotak Mahindra. Analysts see more upside if RBI maintains dovish stance. **Top Performers:** • HDFC Bank: +2.3% • Kotak Mahindra: +2.1% • Axis Bank: +1.9% • ICICI Bank: +1.7%. The banking index has outperformed broader markets, with expectations of improved NIM and credit growth supporting the sector. Analysts expect the momentum to continue if RBI maintains accommodative policy stance. Private sector banks are particularly well-positioned with strong balance sheets and improving asset quality metrics.`,
        category: "nifty",
        stockSymbol: "BANK NIFTY",
        stockPrice: "51,234",
        priceChange: "+1.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "5 minutes ago"
      },
      {
        title: "Nifty Volatility Drops Below 11",
        content: `India VIX fell below 11, indicating calm in the market. Experts say this could mean sustained bullish sentiment. **Market Stability Indicators:** • India VIX: 10.8 (-8.4%) • Low volatility environment • Sustained bullish sentiment • Reduced uncertainty. The drop in volatility index suggests market participants are more confident about the current trajectory. This typically indicates reduced hedging costs and increased risk appetite among investors. Lower volatility often precedes sustained market rallies, as it attracts more institutional and retail participation in equity markets.`,
        category: "nifty",
        stockSymbol: "INDIA VIX",
        stockPrice: "10.8",
        priceChange: "-8.4%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 hour ago"
      },
      {
        title: "IT Stocks Lift Nifty After Weak Start",
        content: `Infosys, TCS led a strong recovery in the Nifty index after a weak opening. Mid-day buying turned market green. IT Sector Performance: Infosys +3.2%, TCS +2.8%, HCL Tech +2.5%, Wipro +1.9%. IT stocks showed remarkable resilience, recovering from early losses to lead the market higher. Strong dollar and positive commentary on deal wins supported the sector. The recovery demonstrates the defensive nature of IT stocks during volatile market conditions, with institutional investors adding positions on any weakness.`,
        category: "nifty",
        stockSymbol: "NIFTY IT",
        stockPrice: "34,567",
        priceChange: "+2.1%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "15 minutes ago"
      },
      {
        title: "Nifty Midcap Index Hits Record High",
        content: `Midcap stocks rallied as the Nifty Midcap 100 index touched a new peak. Strong Q4 earnings and retail participation drove gains. Midcap Highlights: Nifty Midcap 100 all-time high, Retail participation surge, Q4 earnings optimism, Broad-based rally. The midcap segment has shown exceptional strength with consistent outperformance over large caps. Strong domestic flows and improved earnings visibility are key drivers. Several midcap stocks are trading at reasonable valuations compared to their large-cap peers, attracting value-conscious investors.`,
        category: "nifty",
        stockSymbol: "NIFTY MIDCAP",
        stockPrice: "38,925",
        priceChange: "+1.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "20 minutes ago"
      },
      // Movers
      {
        title: "Zomato Jumps 7% on Blinkit Expansion",
        content: `Zomato surged 7% after reports of Blinkit expanding into Tier-2 cities. Analysts see revenue growth potential. Expansion Details: Blinkit entering 50+ Tier-2 cities, Quick commerce market expansion, Revenue growth potential identified, Strong analyst upgrades. The quick commerce expansion is expected to significantly boost Zomato's GMV and market share. Blinkit's expansion into smaller cities taps into underserved markets with high growth potential. Analysts have upgraded price targets, citing the strategic move to capture market share in the growing quick commerce segment before competition intensifies.`,
        category: "movers",
        stockSymbol: "ZOMATO",
        stockPrice: "₹186.50",
        priceChange: "+7.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "30 minutes ago"
      },
      {
        title: "Tata Motors Up 6%, Hits 52-Week High",
        content: `Tata Motors rallied after strong monthly EV sales data and JLR export guidance. Performance Highlights: EV sales up 45% month-on-month, JLR export outlook improved, 52-week high achieved, Strong institutional buying. Tata Motors' EV division showed remarkable growth with Nexon EV leading sales. The company's JLR subsidiary also provided positive export guidance for the coming quarters. The stock has been a top performer in the auto sector, with analysts praising the company's strategic focus on electric mobility and premium segments.`,
        category: "movers",
        stockSymbol: "TATA MOTORS",
        stockPrice: "₹1,068.75",
        priceChange: "+6.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "35 minutes ago"
      },
      {
        title: "Adani Green Soars 8% on Fundraising Buzz",
        content: `Adani Green gained sharply amid reports of a large institutional fundraise to expand solar projects. Fundraising Details: Large institutional fundraise, Solar project expansion plans, Strong investor interest, Capacity expansion roadmap. The fundraising is expected to accelerate Adani Green's solar capacity addition plans and strengthen its position as India's largest renewable energy company. Market participants view this positively as it provides the company with resources to capitalize on the growing renewable energy opportunities in India.`,
        category: "movers",
        stockSymbol: "ADANIGREEN",
        stockPrice: "₹1,334.80",
        priceChange: "+8.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "4 hours ago"
      },
      {
        title: "IRCTC Gains 5% on Rail Connectivity Boost",
        content: `IRCTC stock jumped after the Railway Ministry announced new premium trains between major cities.

**Railway Expansion:**
• New premium train routes
• Enhanced connectivity
• Revenue growth prospects
• Government support

The announcement of new premium trains is expected to boost IRCTC's catering and ticketing revenues. Enhanced rail connectivity will drive higher passenger traffic and improve utilization rates.

The government's continued focus on railway infrastructure development provides a strong tailwind for IRCTC's business growth.`,
        category: "movers",
        stockSymbol: "IRCTC",
        stockPrice: "₹845.60",
        priceChange: "+5.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "5 hours ago"
      },
      {
        title: "JSW Steel Slides 4% After Weak US Demand",
        content: `JSW Steel fell following reports of lower steel exports to the US. Brokers cut FY25 margin estimates.

**Key Concerns:**
• US steel demand weakness
• Export volumes declining
• Margin pressure expected
• Broker downgrades

The steel major faces headwinds from reduced US demand and increased competition from Chinese exports. This has led to margin compression concerns for the upcoming fiscal year.

Several brokerages have cut their FY25 earnings estimates, citing challenging export environment and domestic pricing pressures.`,
        category: "movers",
        stockSymbol: "JSW STEEL",
        stockPrice: "₹912.40",
        priceChange: "-4.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "6 hours ago"
      },
      // Breakouts
      {
        title: "Bharat Forge Breaks Out of 3-Year Range",
        content: "Bharat Forge surged above ₹1,400 resistance with high volume, signaling a long-term breakout. 3-year resistance broken with high volume confirmation targeting ₹1,600 levels. Strong institutional interest supports the breakout momentum. The stock has been consolidating in the ₹1,200-1,400 range for three years. Technical analysts see 15% upside potential supported by improving business fundamentals and order book visibility.",
        category: "breakout",
        stockSymbol: "BHARATFORG",
        stockPrice: "₹1,423.60",
        priceChange: "+8.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 hour ago"
      },
      {
        title: "Delta Corp Hits Upper Circuit on Casino News",
        content: "Delta Corp jumped 10% as Goa approved extended casino licenses with breakout seen above ₹160. Goa extends casino licenses removing regulatory overhang while upper circuit hit signals strong momentum. Gaming sector revival underway with business continuity assured. The extended licenses provide stability and boost investor confidence. Technical breakout above key resistance levels suggests further upside potential as regulatory environment stabilizes.",
        category: "breakout",
        stockSymbol: "DELTAGROUP",
        stockPrice: "₹176.80",
        priceChange: "+10.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 hours ago"
      },
      {
        title: "MapMyIndia Zooms 12% on EV Mapping Deal",
        content: "MapMyIndia hit a breakout after signing partnership with EV makers for in-car navigation systems. EV navigation systems deal with multiple OEM partnerships improves revenue visibility and growth in automotive tech segment. The partnership with leading EV manufacturers for integrated navigation solutions opens new revenue streams. Real-time mapping and navigation services directly embedded in vehicles create recurring revenue model. Automotive technology segment expected to be major growth driver with increasing connected car adoption and EV penetration in India.",
        category: "breakout",
        stockSymbol: "MAPMYINDIA",
        stockPrice: "₹1,756.80",
        priceChange: "+12.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "3 hours ago"
      },
      {
        title: "Mazagon Dock Launches From ₹2,400 Base",
        content: "After weeks of consolidation, Mazagon Dock rallied strongly with technical charts signaling fresh uptrend. Consolidation breakout with fresh uptrend signals supported by defense sector strength and order book visibility. The defense shipbuilder has broken out from consolidation phase with strong order book and government defense spending providing fundamental support. Technical indicators suggest sustained upward momentum as defense sector benefits from increased government focus on indigenization.",
        category: "breakout",
        stockSymbol: "MAZAGON",
        stockPrice: "₹2,567.30",
        priceChange: "+7.2%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "4 hours ago"
      },
      {
        title: "L&T Tech Services Sees Bullish Breakout",
        content: "L&T Tech Services moved above ₹5,000 with institutional buying while RSI and MACD support further gains. Breakout above ₹5,000 with institutional buying support shows RSI bullish crossover and MACD positive divergence. The IT services company has shown strong technical momentum with multiple indicators suggesting continued upward movement. Strong institutional interest provides additional support. The breakout comes amid improving demand environment for IT services and company's focus on emerging technologies like AI and cloud computing.",
        category: "breakout",
        stockSymbol: "LTTS",
        stockPrice: "₹5,123.40",
        priceChange: "+6.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "5 hours ago"
      },
      // Others
      {
        title: "RBI Holds Rates, Focuses on Liquidity",
        content: `RBI kept repo rate unchanged at 6.5%. Focus shifted to managing liquidity and inflation moderation.

**Policy Decisions:**
• Repo rate: 6.5% (unchanged)
• Liquidity management focus
• Inflation moderation efforts
• Growth support measures

The central bank maintained its cautious approach, prioritizing price stability while supporting economic growth. RBI Governor emphasized the need for careful liquidity management in the current environment.

The decision was in line with market expectations, with the central bank maintaining its focus on bringing inflation closer to the 4% target while ensuring adequate liquidity in the system.`,
        category: "others",
        stockSymbol: "RBI POLICY",
        stockPrice: "6.5%",
        priceChange: "Unchanged",
        exchange: "POLICY",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "6 hours ago"
      },
      {
        title: "Gold ETF Inflows Rise Amid Volatility",
        content: `Investors turned to Gold ETFs, with ₹1,200 crore inflow in May amid global uncertainty.

**Gold Investment Trends:**
• ETF inflows: ₹1,200 crores
• Global uncertainty driving demand
• Safe haven asset preference
• Portfolio diversification

Rising geopolitical tensions and market volatility have increased investor appetite for gold as a safe haven asset. ETF investments provide convenient exposure to gold without physical storage concerns.

The trend reflects investors' desire to diversify portfolios and hedge against potential market corrections and currency fluctuations.`,
        category: "others",
        stockSymbol: "GOLD ETF",
        stockPrice: "₹5,847",
        priceChange: "+2.3%",
        exchange: "ETF",
        imageUrl: "https://images.unsplash.com/photo-1610375461369-d613b564cd1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "7 hours ago"
      },
      {
        title: "SEBI Warns Against Unregistered Advisors",
        content: `SEBI issued notices to 15 unregistered financial influencers offering paid tips on Telegram and YouTube.

**Regulatory Action:**
• 15 unregistered advisors targeted
• Telegram and YouTube platforms
• Paid tip services illegal
• Investor protection focus

The market regulator continues its crackdown on unregistered investment advisors who offer stock tips and investment advice without proper authorization.

SEBI's action aims to protect retail investors from potentially fraudulent schemes and ensure that only registered and qualified professionals provide investment advice.`,
        category: "others",
        stockSymbol: "SEBI",
        stockPrice: "Regulatory",
        priceChange: "Action",
        exchange: "MARKET",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "8 hours ago"
      },
      {
        title: "India's Forex Reserves Hit $650 Billion",
        content: `The RBI reported record forex reserves, providing a strong buffer against global shocks.

**Reserve Highlights:**
• Total reserves: $650 billion
• New record high achieved
• Strong external position
• Global shock buffer

India's forex reserves have reached a new milestone, strengthening the country's external position and providing adequate cushion against global economic uncertainties.

The robust reserves position enhances India's ability to manage external sector vulnerabilities and supports the rupee's stability in volatile global markets.`,
        category: "others",
        stockSymbol: "FOREX",
        stockPrice: "$650B",
        priceChange: "Record High",
        exchange: "RBI",
        imageUrl: "https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "9 hours ago"
      },
      {
        title: "Retail Participation in F&O Surges 40%",
        content: `NSE data shows retail trading in F&O hit record highs. Experts caution over rising leverage risk.

**F&O Trading Surge:**
• Retail participation up 40%
• Record trading volumes
• Leverage risk concerns
• Market education needed

The surge in retail participation in derivatives trading reflects increased market awareness but also raises concerns about risk management among individual investors.

Experts recommend proper education and risk assessment before engaging in leveraged trading, as F&O instruments can amplify both gains and losses significantly.`,
        category: "others",
        stockSymbol: "NSE F&O",
        stockPrice: "+40%",
        priceChange: "Volume",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "10 hours ago"
      },
      // Warrant News
      {
        title: "One Point One Solutions Warrant Trading at 18% Discount",
        content: `One Point One Solutions Ltd warrant trading at significant discount to current market price. Warrant issued on July 10, 2024 at ₹56 strike price, currently trading 18% below market value of ₹68. Warrant Details: Strike price ₹56, Current market price ₹68, Discount 18%, Warrant value ₹94 Cr, Market cap ₹350 Cr, Warrant represents 27% of total market cap. The warrant provides investors opportunity to participate in company growth at discounted valuation. Current discount reflects market sentiment and timing considerations for warrant conversion.`,
        category: "warrant",
        stockSymbol: "ONEPOINT",
        stockPrice: "₹68.00",
        priceChange: "+21.4%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 minutes ago"
      },
      {
        title: "Systematix Group Warrants Trade Below Strike Price",
        content: `Share India Securities (Systematix Group) warrants trading below strike price indicating market caution. Warrant issued in June-July 2024 with ₹525 strike price now trades at 3% premium to current market price of ₹510. Warrant Analysis: Strike price ₹525, Current market price ₹510, Premium 3%, Warrant value ₹295 Cr, Market cap ₹600 Cr, Warrant represents 49% of market cap. The below-strike trading suggests investors are cautious about near-term prospects despite the significant warrant allocation representing almost half the company's market capitalization.`,
        category: "warrant",
        stockSymbol: "SYSTEMATIX",
        stockPrice: "₹510.00",
        priceChange: "-2.9%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "6 minutes ago"
      },
      {
        title: "Bhatia Communications Warrant Shows 20% Discount Value",
        content: `Bhatia Communications & Retail Ltd warrant offers attractive 20% discount to current trading price. Warrant issued September 12, 2024 with ₹23.75 strike price while stock trades at ₹29.5. Investment Opportunity: Strike price ₹23.75, Current market price ₹29.5, Discount 20%, Warrant value ₹36.8 Cr, Market cap ₹115 Cr, Warrant allocation 32% of market cap. The substantial discount combined with reasonable warrant allocation makes this an interesting play for investors seeking leverage to company's retail and communications business growth.`,
        category: "warrant",
        stockSymbol: "BHATIACOMM",
        stockPrice: "₹29.50",
        priceChange: "+24.2%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "8 minutes ago"
      },
      {
        title: "PCBL Warrants at Modest 8% Discount Despite Large Size",
        content: `Phillips Carbon Black Ltd (PCBL) warrants trading at 8% discount despite representing 61% of market capitalization. Recent April 2025 warrant issue priced around ₹235 with current stock at ₹255. Large Warrant Issue: Strike price ₹235, Current market price ₹255, Discount 8%, Warrant value ₹488 Cr, Market cap ₹800 Cr, Warrant represents 61% of market cap. The modest discount despite the massive warrant size indicates strong institutional confidence in PCBL's carbon black business prospects and expansion plans.`,
        category: "warrant",
        stockSymbol: "PCBL",
        stockPrice: "₹255.00",
        priceChange: "+8.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "12 minutes ago"
      },
      {
        title: "Diamond Power Infrastructure Warrant at 10% Discount",
        content: `Diamond Power Infrastructure Ltd warrant trading at 10% discount to current market levels following April 2025 issuance. Strike price approximately ₹46 with stock currently at ₹51. Infrastructure Play: Strike price ₹46, Current market price ₹51, Discount 10%, Warrant value ₹245 Cr, Market cap ₹500 Cr, Warrant allocation 49% of market cap. The warrant represents significant leverage to India's infrastructure growth story with the company positioned to benefit from ongoing power and infrastructure development projects across the country.`,
        category: "warrant",
        stockSymbol: "DIAMONDPWR",
        stockPrice: "₹51.00",
        priceChange: "+10.9%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "18 minutes ago"
      }
    ];

    sampleArticles.forEach(article => {
      this.createArticle(article);
    });
  }

  async getArticles(category?: string): Promise<Article[]> {
    // Check if we need to sync with Google Sheets
    const now = Date.now();
    if (this.googleSheets && (now - this.lastSyncTime > this.syncInterval || this.articles.size === 0)) {
      await this.syncFromGoogleSheets();
    }
    
    // Debug: Check if articles exist
    console.log('Articles in storage:', this.articles.size);
    
    const allArticles = Array.from(this.articles.values());
    
    // If category is specified, filter by that category
    if (category && category !== "all" && category !== "trending") {
      const filteredArticles = allArticles.filter(article => article.category === category);
      return filteredArticles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    
    // For "trending", return articles sorted by view count first, then other factors
    if (category === "trending") {
      return this.getTrendingArticles();
    }
    
    // Return articles in specific order: nifty (index), breakout, ipo, warrant, then everything else
    const niftyArticles = allArticles.filter(a => a.category === 'nifty');
    const breakoutArticles = allArticles.filter(a => a.category === 'breakout');
    const ipoArticles = allArticles.filter(a => a.category === 'ipo');
    const smeIpoArticles = allArticles.filter(a => a.category === 'sme ipo');
    const warrantArticles = allArticles.filter(a => a.category === 'warrant');
    const otherArticles = allArticles.filter(a => 
      !['nifty', 'breakout', 'ipo', 'sme ipo', 'warrant'].includes(a.category)
    );
    
    // Sort each category by creation date
    const sortByDate = (articles: Article[]) => 
      articles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return [
      ...sortByDate(niftyArticles),
      ...sortByDate(breakoutArticles),
      ...sortByDate(ipoArticles),
      ...sortByDate(smeIpoArticles),
      ...sortByDate(warrantArticles),
      ...sortByDate(otherArticles)
    ];
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const article: Article = {
      id: this.currentArticleId++,
      title: insertArticle.title,
      content: insertArticle.content,
      category: insertArticle.category,
      imageUrl: getArticleImage({
        title: insertArticle.title,
        content: insertArticle.content,
        category: insertArticle.category,
        stockSymbol: insertArticle.stockSymbol
      }),
      timeAgo: insertArticle.timeAgo,
      stockSymbol: insertArticle.stockSymbol ?? null,
      stockPrice: insertArticle.stockPrice ?? null,
      priceChange: insertArticle.priceChange ?? null,
      exchange: insertArticle.exchange ?? null,
      isPremium: false,
      createdAt: new Date(),
      source: null,
      sentiment: null,
    };
    this.articles.set(article.id, article);
    return article;
  }

  async getBookmarks(): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values());
  }

  async addBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: this.currentBookmarkId++,
      ...insertBookmark,
      createdAt: new Date(),
    };
    this.bookmarks.set(bookmark.id, bookmark);
    return bookmark;
  }

  async removeBookmark(articleId: number): Promise<void> {
    for (const [id, bookmark] of this.bookmarks.entries()) {
      if (bookmark.articleId === articleId) {
        this.bookmarks.delete(id);
        break;
      }
    }
  }

  async isBookmarked(articleId: number): Promise<boolean> {
    for (const bookmark of this.bookmarks.values()) {
      if (bookmark.articleId === articleId) {
        return true;
      }
    }
    return false;
  }

  // Add sample new article for testing notification system
  private generateUniqueArticleContent(title: string, category: string, stockSymbol?: string, stockPrice?: string, priceChange?: string, index?: number): string {
    const contentVariations = [
      `${title} - Market analysis reveals significant developments in the ${category} sector. `,
      `Breaking: ${title} has emerged as a key market story today. `,
      `${title} represents important movements in current market dynamics. `,
      `Latest update on ${title} shows evolving trends in the ${category} space. `,
      `${title} captures investor attention with notable market implications. `
    ];
    
    const additionalInsights = [
      'Technical indicators suggest continued momentum with strong volume support.',
      'Fundamental analysis reveals robust growth prospects and market positioning.',
      'Institutional activity indicates sustained interest from major market participants.',
      'Sector rotation patterns highlight potential opportunities for strategic investors.',
      'Market sentiment remains positive with favorable risk-reward dynamics.'
    ];
    
    const baseContent = contentVariations[index % contentVariations.length];
    const insight = additionalInsights[index % additionalInsights.length];
    
    let stockDetails = '';
    if (stockSymbol && stockPrice) {
      stockDetails = ` ${stockSymbol} is currently trading at ${stockPrice}`;
      if (priceChange) {
        stockDetails += ` showing ${priceChange} movement`;
      }
      stockDetails += ' in the current session.';
    }
    
    return baseContent + insight + stockDetails + ' Traders and investors are monitoring these developments for potential market opportunities.';
  }

  async addTestArticle(): Promise<Article> {
    const testArticles = [
      {
        title: "Breaking: Sensex Crosses 80,000 Mark in Historic Rally",
        content: `Indian stock markets witnessed historic milestone as BSE Sensex crossed 80,000 points for first time ever. The benchmark index surged 2.1% driven by strong buying in banking, IT and pharma sectors. Market experts attribute the rally to positive Q4 earnings, FII inflows and optimistic economic outlook. Banking giants HDFC Bank, ICICI Bank and SBI contributed significantly to the gains. IT majors TCS, Infosys showed strong momentum on cloud computing demand. Pharma sector led by Sun Pharma, Dr Reddy's gained on export opportunities. Market breadth remained positive with advancing stocks outnumbering decliners 3:1. Trading volumes increased substantially indicating broad-based participation.`,
        category: "nifty",
        stockSymbol: "SENSEX",
        stockPrice: "₹80,125",
        priceChange: "+2.1%",
        exchange: "BSE",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "Just now"
      },
      {
        title: "Reliance Industries Announces Major Green Energy Investment",
        content: `Reliance Industries announced ₹75,000 crore investment in renewable energy over next 3 years. The conglomerate plans to establish solar manufacturing, battery storage and green hydrogen facilities. RIL shares jumped 4.2% on the announcement with market cap crossing ₹18 lakh crore. Chairman Mukesh Ambani outlined ambitious targets for carbon neutrality by 2035. The investment includes partnerships with global technology leaders for advanced manufacturing capabilities. Analysts upgraded target price citing strong fundamentals and growth prospects. The move positions RIL as major player in India's energy transition story.`,
        category: "breakout",
        stockSymbol: "RELIANCE",
        stockPrice: "₹2,845",
        priceChange: "+4.2%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 minutes ago"
      }
    ];

    const randomArticle = testArticles[Math.floor(Math.random() * testArticles.length)];
    return await this.createArticle(randomArticle);
  }

  async incrementViewCount(articleId: number): Promise<void> {
    const article = this.articles.get(articleId);
    if (article) {
      article.viewCount = (article.viewCount || 0) + 1;
      this.articles.set(articleId, article);
    }
  }

  async getTrendingArticles(): Promise<Article[]> {
    const allArticles = Array.from(this.articles.values());
    
    // Sort by view count (most viewed first), then by recency
    const sortedByViews = allArticles.sort((a, b) => {
      const viewCountA = a.viewCount || 0;
      const viewCountB = b.viewCount || 0;
      
      // Primary sort: view count (descending)
      if (viewCountA !== viewCountB) {
        return viewCountB - viewCountA;
      }
      
      // Secondary sort: creation time (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    // Mix trending articles with variety from different categories
    const mostViewed = sortedByViews.slice(0, 15); // Top 15 most viewed
    
    // Fill remaining slots with diverse content from different categories
    const remainingArticles = sortedByViews.slice(15);
    const categorizedRemaining = {
      nifty: remainingArticles.filter(a => a.category === 'nifty').slice(0, 2),
      breakout: remainingArticles.filter(a => a.category === 'breakout').slice(0, 2),
      ipo: remainingArticles.filter(a => a.category === 'ipo').slice(0, 2),
      research_report: remainingArticles.filter(a => a.category === 'research_report').slice(0, 2),
      movers: remainingArticles.filter(a => a.category === 'movers').slice(0, 2),
      others: remainingArticles.filter(a => 
        !['nifty', 'breakout', 'ipo', 'research_report', 'movers'].includes(a.category)
      ).slice(0, 5)
    };
    
    const diverseContent = [
      ...categorizedRemaining.nifty,
      ...categorizedRemaining.breakout,
      ...categorizedRemaining.ipo,
      ...categorizedRemaining.research_report,
      ...categorizedRemaining.movers,
      ...categorizedRemaining.others
    ];
    
    return [...mostViewed, ...diverseContent];
  }
}

export const storage = new MemStorage();