import type { Article, Bookmark, InsertArticle, InsertBookmark } from "@shared/schema";

export interface IStorage {
  getArticles(category?: string): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  getBookmarks(): Promise<Bookmark[]>;
  addBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  removeBookmark(articleId: number): Promise<void>;
  isBookmarked(articleId: number): Promise<boolean>;
  addTestArticle(): Promise<Article>;
}

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private bookmarks: Map<number, Bookmark>;
  private currentArticleId: number;
  private currentBookmarkId: number;

  constructor() {
    this.articles = new Map();
    this.bookmarks = new Map();
    this.currentArticleId = 1;
    this.currentBookmarkId = 1;
    this.initializeData();
  }

  private initializeData() {
    const sampleArticles = [
      {
        title: "Nifty Hits 23,500 for First Time, Sensex Soars",
        content: `The Nifty 50 surged to a new all-time high of 23,500 driven by strong buying across sectors. Banking, IT, and pharma stocks led the rally with heavy institutional participation. Market Breadth: Advancing stocks outnumbered decliners 4:1, indicating broad-based strength. Banking giants HDFC Bank, ICICI Bank, and SBI contributed significantly to the gains. IT majors like TCS and Infosys showed resilience on positive global cues. The pharma sector also participated with Sun Pharma and Dr. Reddy's among top gainers. Market experts attribute the rally to strong Q4 earnings, positive FII flows, and optimistic economic outlook. Trading volumes surged 35% above average, indicating strong retail and institutional interest.`,
        category: "nifty",
        stockSymbol: "NIFTY",
        stockPrice: "23,500",
        priceChange: "+1.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "5 minutes ago"
      },
      {
        title: "Nifty Volatility Drops Below 11",
        content: `India VIX fell below 11, indicating calm in the market. Experts say this could mean sustained bullish sentiment. Market Stability Indicators: India VIX: 10.8 (-8.4%), Low volatility environment, Sustained bullish sentiment, Reduced uncertainty. The drop in volatility index suggests market participants are more confident about the current trajectory. This typically indicates reduced hedging costs and increased risk appetite among investors. Lower volatility often precedes sustained market rallies, as it attracts more institutional and retail participation in equity markets.`,
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
        imageUrl: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "30 minutes ago"
      },
      {
        title: "Tata Motors Up 6%, Hits 52-Week High",
        content: `Tata Motors rallied after strong monthly EV sales data and JLR export guidance. Performance Highlights: EV sales up 45% month-on-month, JLR export outlook improved, 52-week high achieved, Strong institutional buying. Tata Motors' EV division showed remarkable growth with Nexon EV leading sales. The company's JLR subsidiary also provided positive export guidance for the coming quarters. The stock has been a top performer in the auto sector, with analysts praising the company's strategic focus on electric mobility and premium segments.`,
        category: "movers",
        stockSymbol: "TATAMOTORS",
        stockPrice: "₹945.30",
        priceChange: "+6.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1493238792000-8113da705763?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "45 minutes ago"
      },
      {
        title: "HDFC Bank Gains 4% on Strong Q4 Numbers",
        content: `HDFC Bank shares rose 4% following robust Q4 earnings that beat estimates. Strong loan growth and improved asset quality drove performance. Key Metrics: Net profit up 24% YoY, Loan growth at 16%, NPA ratio declined to 1.2%, ROA improved to 1.8%. The bank's strong performance was driven by healthy loan demand across segments and improved operational efficiency. Management guidance for the next fiscal year remains optimistic with credit growth expected to sustain. The merger synergies with HDFC Ltd are also showing positive results.`,
        category: "movers",
        stockSymbol: "HDFCBANK",
        stockPrice: "₹1,650.75",
        priceChange: "+4.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 hour ago"
      },
      {
        title: "Reliance Industries Climbs 3% on Green Energy Push",
        content: `RIL gained 3% as the company announced major investments in renewable energy and green hydrogen projects. Investment Details: ₹75,000 crore investment planned, Focus on solar and battery manufacturing, Green hydrogen production facilities, Carbon neutrality target by 2035. Reliance's ambitious green energy roadmap positions it as a key player in India's energy transition. The investment spans across multiple green technologies including solar panel manufacturing, battery storage systems, and green hydrogen production. Analysts view this as a strategic move to diversify revenue streams and capitalize on the global shift towards clean energy.`,
        category: "movers",
        stockSymbol: "RELIANCE",
        stockPrice: "₹2,845.60",
        priceChange: "+3.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1.5 hours ago"
      },
      {
        title: "ITC Rises 2.5% on Cigarette Volume Recovery",
        content: `ITC shares gained 2.5% following reports of cigarette volume recovery in key markets. Strong FMCG segment performance also supported the stock. Business Update: Cigarette volumes up 8% QoQ, FMCG segment growth at 12%, Hotel business recovery continues, Paper and packaging division stable. The cigarette business, ITC's largest revenue contributor, showed signs of volume recovery after several quarters of decline. The company's diversification strategy into FMCG, hotels, and agri-business continues to provide stability and growth opportunities beyond the traditional tobacco business.`,
        category: "movers",
        stockSymbol: "ITC",
        stockPrice: "₹425.80",
        priceChange: "+2.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 hours ago"
      },
      // Breakout stocks
      {
        title: "Adani Green Energy Breaks Out Above ₹1,000",
        content: `Adani Green Energy surged past ₹1,000 mark for the first time in 6 months. Strong renewable energy order book and government policy support drove the breakout. Technical Analysis: Breakout above ₹1,000 resistance, Volume surge of 150%, RSI at 65 (bullish territory), Moving averages turning positive. The stock had been consolidating between ₹800-1,000 for several months before this decisive breakout. Strong order book visibility and favorable policy environment for renewable energy sector are key catalysts. Analysts expect the momentum to continue with next resistance at ₹1,200.`,
        category: "breakout",
        stockSymbol: "ADANIGREEN",
        stockPrice: "₹1,025.40",
        priceChange: "+8.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "30 minutes ago"
      },
      {
        title: "L&T Technology Services Crosses ₹5,000 Level",
        content: `LTTS broke above ₹5,000 psychological level on strong order wins and margin expansion guidance. Engineering R&D demand remains robust. Breakout Factors: Order book at all-time high, Margin expansion guidance raised, Digital transformation deals increase, Client addition in automotive sector. The stock has been in an uptrend for the past 3 months, consistently making higher highs and higher lows. Strong demand for engineering services in automotive, aerospace, and industrial segments is driving growth. Management's confident outlook on margin expansion has attracted institutional buying.`,
        category: "breakout",
        stockSymbol: "LTTS",
        stockPrice: "₹5,125.90",
        priceChange: "+5.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 hour ago"
      },
      {
        title: "Dixon Technologies Surges Past ₹15,000",
        content: `Dixon Technologies broke out decisively above ₹15,000 as PLI scheme benefits and new client additions boost growth prospects. Manufacturing Momentum: PLI scheme orders worth ₹5,000 crore, New smartphone client additions, Expansion in LED and appliances, Capacity utilization improving. The stock has been one of the biggest beneficiaries of the government's PLI scheme for electronics manufacturing. Strong order book visibility and expanding client base in multiple product categories are driving investor confidence. The company's focus on domestic manufacturing aligns with government initiatives.`,
        category: "breakout",
        stockSymbol: "DIXON",
        stockPrice: "₹15,420.75",
        priceChange: "+7.2%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "45 minutes ago"
      },
      {
        title: "Solar Industries Breaks 52-Week High",
        content: `Solar Industries India surged to a new 52-week high driven by strong explosives demand from mining and infrastructure sectors. Sector Tailwinds: Mining activity increase, Infrastructure project acceleration, Export demand growth, Defense orders pipeline strong. The explosives and industrial chemicals manufacturer has been benefiting from increased mining activity and infrastructure development. Strong demand from coal mining, road construction, and defense sectors is driving revenue growth. The company's expansion into international markets is also providing additional growth avenues.`,
        category: "breakout",
        stockSymbol: "SOLARINDS",
        stockPrice: "₹8,950.30",
        priceChange: "+6.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1.5 hours ago"
      },
      {
        title: "Persistent Systems Crosses ₹6,000 Mark",
        content: `Persistent Systems broke above ₹6,000 level supported by strong deal wins and digital transformation demand. IT Services Growth: Large deal wins in Q4, Digital transformation projects increase, Client mining success, Margin stability maintained. The mid-cap IT services company has been consistently gaining market share through focused industry verticals and digital capabilities. Strong client relationships and repeat business are driving sustainable growth. The company's specialized focus on hi-tech, banking, and healthcare verticals is paying dividends.`,
        category: "breakout",
        stockSymbol: "PERSISTENT",
        stockPrice: "₹6,125.45",
        priceChange: "+4.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 hours ago"
      },
      // Others category
      {
        title: "Asian Paints Faces Pressure on Raw Material Costs",
        content: `Asian Paints declined 2% as crude oil price surge raises concerns about raw material cost inflation. Cost pressures may impact margins in near term. Challenges Ahead: Crude oil prices up 8% this week, Raw material cost inflation expected, Margin pressure in Q1 anticipated, Volume growth may slow down. The decorative paints major faces headwinds from rising input costs, particularly petroleum-based raw materials. While demand remains steady in urban markets, rural recovery is still gradual. Management will need to balance pricing actions with volume growth to maintain market share.`,
        category: "others",
        stockSymbol: "ASIANPAINT",
        stockPrice: "₹2,985.20",
        priceChange: "-2.0%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1574263867128-1c65b99d8e83?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "1 hour ago"
      },
      {
        title: "Hindustan Unilever Reports Steady Q4 Growth",
        content: `HUL posted steady Q4 results with volume growth across categories. Rural markets show signs of gradual recovery. Performance Metrics: Volume growth at 4%, Rural markets recovering slowly, Premium segment outperforms, Margin expansion of 50 bps. The FMCG giant's performance reflects the broader consumer goods sector trends with urban demand remaining resilient while rural markets are gradually improving. Innovation in premium segments and digital initiatives are supporting growth. The company maintains its market leadership position across most categories.`,
        category: "others",
        stockSymbol: "HINDUNILVR",
        stockPrice: "₹2,650.80",
        priceChange: "+1.5%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "2 hours ago"
      },
      {
        title: "Bharti Airtel Upgrades Network Infrastructure",
        content: `Bharti Airtel announced ₹25,000 crore investment in 5G network expansion and fiber infrastructure upgrade across India. Network Expansion: 5G rollout in 500+ cities, Fiber network expansion, Data center investments, Rural connectivity improvements. The telecom major's aggressive infrastructure investment aims to strengthen its competitive position against rivals. 5G services launch in key metros has shown promising early adoption. The company's focus on digital services and enterprise solutions is expected to drive ARPU growth in coming quarters.`,
        category: "others",
        stockSymbol: "BHARTIARTL",
        stockPrice: "₹925.45",
        priceChange: "+2.8%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1448630360428-65456885c650?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "3 hours ago"
      },
      {
        title: "ONGC Production Targets Raised for FY25",
        content: `Oil and Natural Gas Corporation raised production targets following successful exploration in KG basin. New discoveries boost reserve estimates. Production Update: Oil production target up 5%, Gas production increased 8%, New discoveries in KG basin, Reserve replacement ratio improved. The state-owned oil explorer's enhanced production guidance comes on the back of successful drilling campaigns and improved recovery from existing fields. Higher production volumes combined with favorable oil prices are expected to boost profitability. The company's focus on domestic exploration aligns with energy security objectives.`,
        category: "others",
        stockSymbol: "ONGC",
        stockPrice: "₹195.60",
        priceChange: "+40%",
        exchange: "NSE",
        imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
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
        imageUrl: "https://images.unsplash.com/photo-1448630360428-65456885c650?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        timeAgo: "18 minutes ago"
      }
    ];

    sampleArticles.forEach((article, index) => {
      const createdArticle: Article = {
        id: this.currentArticleId++,
        title: article.title,
        content: article.content,
        category: article.category,
        imageUrl: article.imageUrl,
        timeAgo: article.timeAgo,
        stockSymbol: article.stockSymbol ?? null,
        stockPrice: article.stockPrice ?? null,
        priceChange: article.priceChange ?? null,
        exchange: article.exchange ?? null,
        isPremium: article.category === 'warrant' || article.category === 'breakout',
        createdAt: new Date(),
      };
      this.articles.set(createdArticle.id, createdArticle);
    });
  }

  async getArticles(category?: string): Promise<Article[]> {
    const allArticles = Array.from(this.articles.values());
    if (category && category !== "all") {
      return allArticles.filter(article => article.category === category).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return allArticles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      imageUrl: insertArticle.imageUrl,
      timeAgo: insertArticle.timeAgo,
      stockSymbol: insertArticle.stockSymbol ?? null,
      stockPrice: insertArticle.stockPrice ?? null,
      priceChange: insertArticle.priceChange ?? null,
      exchange: insertArticle.exchange ?? null,
      isPremium: insertArticle.category === 'warrant' || insertArticle.category === 'breakout',
      createdAt: new Date(),
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
}

export const storage = new MemStorage();