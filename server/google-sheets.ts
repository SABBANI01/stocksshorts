import { google } from 'googleapis';
import type { Article } from "@shared/schema";
import { getArticleImage } from "./image-logic";

export class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;
  private sheetName: string = 'Sheet1';

  static createFromEnv() {
    const serviceAccountKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!serviceAccountKeyJson || !spreadsheetId) {
      return null;
    }
    
    try {
      const serviceAccountKey = JSON.parse(serviceAccountKeyJson);
      return new GoogleSheetsService(serviceAccountKey, spreadsheetId);
    } catch (error) {
      console.error('Failed to parse service account key:', error);
      return null;
    }
  }

  constructor(serviceAccountKey: any, spreadsheetId: string) {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = spreadsheetId;
  }

  async fetchArticles(): Promise<Article[]> {
    try {
      const range = `${this.sheetName}!A2:O1000`; // Skip header row, extended to column M
      
      console.log(`Fetching from spreadsheet: ${this.spreadsheetId}, range: Sheet1!A2:O1000`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rows = response.data.values || [];
      console.log(`Found ${rows.length} rows in Google Sheets`);

      return rows
        .filter((row: string[]) => row.length >= 3 && row[0] && row[1]) // Must have id and title
        .map((row: string[], index: number): Article => {
          // Standardize and validate category
          const rawCategory = (row[3] || '').toLowerCase().trim();
          const category = this.mapToValidCategory(rawCategory);
          
          // Always generate unique content or use existing content
          let content = row[2] || '';
          
          // If content is empty, generic, or appears to be duplicate, generate unique content
          const isGenericContent = content.includes('Domestic indices extended gains') || 
                                  content.includes('Technical analysts highlight') ||
                                  content.trim() === '';
          
          if (isGenericContent) {
            content = this.generateUniqueContent(row[1] || 'Untitled', category, row[4], row[5], row[6], index);
          }

          const articleData = {
            id: parseInt(row[0]) || index + 1,
            title: row[1] || 'Untitled',
            content: content,
            category: category,
            stockSymbol: row[4] || null,
            stockPrice: row[5] || null,
            priceChange: row[6] || null,
            exchange: row[7] || null,
            timeAgo: row[9] || "Just now",
            isPremium: (row[10] || "").toLowerCase() === 'true',
            createdAt: new Date(),
            source: row[11] || null, // Column L - source
            sentiment: row[13] || null, // Column N - sentiment
            priceTarget: row[12] || null, // Column M - price/target (was previously sentiment)
            imageUrl: ""
          };
          
          // Debug: Log the content for first few articles
          if (index < 3) {
            console.log(`Article ${articleData.id}: Title="${articleData.title}", Sentiment="${articleData.sentiment}", PriceChange="${articleData.priceChange}"`);
          }
          
          // Use intelligent image selection based on article content
          articleData.imageUrl = getArticleImage(articleData);
          
          return articleData;
        });
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      return [];
    }
  }

  private mapToValidCategory(rawCategory: string): string {
    // Define valid categories matching frontend filters
    const categoryMap: { [key: string]: string } = {
      // Global categories
      'global': 'global',
      'world': 'global',
      'international': 'global',
      'us market': 'global',
      'dow': 'global',
      'nasdaq': 'global',
      's&p': 'global',
      
      // Nifty categories (exclude MCX)
      'nifty': 'nifty',
      'market': 'nifty',
      'markets': 'nifty',
      'index': 'nifty',
      'sensex': 'nifty',
      'banknifty': 'nifty',
      'bank nifty': 'nifty',
      
      // Warrant categories
      'warrant': 'warrant',
      'warrants': 'warrant',
      'call warrant': 'warrant',
      'put warrant': 'warrant',
      
      // Breakout categories
      'breakout': 'breakout',
      'breakouts': 'breakout',
      'technical': 'breakout',
      'chart': 'breakout',
      
      // Research Report categories
      'research report': 'research_report',
      'research_report': 'research_report',
      'researchreport': 'research_report',
      'research': 'research_report',
      'report': 'research_report',
      'analysis': 'research_report',
      'analyst': 'research_report',
      
      // Movers categories
      'movers': 'movers',
      'mover': 'movers',
      'most active': 'movers',
      'mostactive': 'movers',
      'gainers': 'movers',
      'losers': 'movers',
      'top gainers': 'movers',
      'top losers': 'movers',
      
      // Order wins categories
      'orderwins': 'order_wins',
      'order wins': 'order_wins',
      'order_wins': 'order_wins',
      'orderwin': 'order_wins',
      'order win': 'order_wins',
      'wins': 'order_wins',
      'deal': 'order_wins',
      'contract': 'order_wins',
      
      // ATH categories
      'ath': 'ath',
      'all time high': 'ath',
      'all-time high': 'ath',
      'record high': 'ath',
      'new high': 'ath',
      
      // Results categories
      'results': 'results',
      'result': 'results',
      'earnings': 'results',
      'quarterly': 'results',
      'q1': 'results',
      'q2': 'results',
      'q3': 'results',
      'q4': 'results',
      
      // IPO categories
      'ipo': 'ipo',
      'ipos': 'ipo',
      'initial public offering': 'ipo',
      'public offering': 'ipo',
      'listing': 'ipo',
      
      // SME IPO categories
      'sme ipo': 'sme ipo',
      'smeipo': 'sme ipo',
      'sme': 'sme ipo',
      'small medium enterprises': 'sme ipo',
      
      // MCX/Commodities (separate from index)
      'mcx': 'others',
      'commodity': 'others',
      'commodities': 'others',
      'gold': 'others',
      'silver': 'others',
      'crude': 'others',
      'oil': 'others',
      
      // Others/General
      'others': 'others',
      'other': 'others',
      'general': 'others',
      'news': 'others',
      'policy': 'others',
      'rbi': 'others',
      'government': 'others'
    };
    
    // Look for exact match first
    if (categoryMap[rawCategory]) {
      return categoryMap[rawCategory];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(categoryMap)) {
      if (rawCategory.includes(key) || key.includes(rawCategory)) {
        return value;
      }
    }
    
    // Default to 'others' if no match found
    console.log(`Unknown category "${rawCategory}" mapped to "others"`);
    return 'others';
  }

  private generateUniqueContent(title: string, category: string, stockSymbol?: string, stockPrice?: string, priceChange?: string, articleIndex: number = 0): string {
    const contentTemplates = {
      nifty: [
        `${title} reflects the current market sentiment with significant trading activity. The index movement indicates strong investor confidence amid favorable market conditions.`,
        `Market analysts are closely watching ${title} as it impacts broader market trends. Technical indicators suggest continued momentum in the ${category} segment.`,
        `${title} represents a key development in the equity markets. Institutional investors are showing increased interest in this market segment.`
      ],
      trending: [
        `${title} has caught the attention of market participants today. This development could influence sector-wide performance and investor sentiment.`,
        `Breaking: ${title} is making headlines across financial markets. Expert analysis suggests this could be a significant market catalyst.`,
        `${title} emerges as a key market story with potential long-term implications for investors and traders.`
      ],
      breakout: [
        `${title} represents a significant breakout pattern in technical analysis. Chart patterns indicate potential for continued upward momentum.`,
        `Technical breakout alert: ${title} has crossed key resistance levels. Volume analysis supports the sustainability of this move.`,
        `${title} shows strong breakout characteristics with robust trading volumes. This could signal the beginning of a new trend.`
      ],
      research_report: [
        `Latest research report highlights: ${title}. Detailed fundamental analysis reveals key investment insights and recommendations.`,
        `${title} - Comprehensive research analysis covering financial metrics, growth prospects, and market positioning.`,
        `Research update: ${title} provides in-depth sector analysis and stock-specific recommendations for informed investment decisions.`
      ],
      default: [
        `${title} represents an important development in the financial markets. Market dynamics and investor sentiment continue to evolve.`,
        `${title} captures current market attention with significant implications for sector performance and trading strategies.`,
        `Latest update: ${title} reflects ongoing market trends and provides insights into current investment opportunities.`
      ]
    };

    const templates = contentTemplates[category as keyof typeof contentTemplates] || contentTemplates.default;
    const baseContent = templates[articleIndex % templates.length];
    
    // Add varied market insights
    const marketInsights = [
      'Trading volumes remain robust with sustained institutional interest.',
      'Market volatility presents both opportunities and challenges for investors.',
      'Sectoral rotation continues as investors seek value across different segments.',
      'Risk-on sentiment prevails amid favorable macroeconomic conditions.',
      'Technical charts indicate potential for further momentum in this direction.'
    ];
    
    const insight = marketInsights[articleIndex % marketInsights.length];
    
    // Add stock-specific details if available
    let stockDetails = '';
    if (stockSymbol && stockPrice) {
      stockDetails += ` ${stockSymbol} is currently trading at ${stockPrice}`;
      if (priceChange) {
        stockDetails += ` with a movement of ${priceChange}`;
      }
      stockDetails += ' in the current trading session.';
    }

    return baseContent + ' ' + insight + stockDetails + ' Market participants continue to monitor these developments for strategic positioning.';
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      return !!response.data;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }
}