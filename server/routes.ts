import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authStorage } from "./database-storage";
import { insertBookmarkSchema, insertUserSchema, insertReadLaterSchema, insertUpiPaymentSchema, insertArticleViewSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import session from "express-session";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'stock-news-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, phoneNumber, name, googleId } = req.body;
      
      if (!email && !phoneNumber) {
        return res.status(400).json({ message: "Email or phone number required" });
      }

      let user;
      
      // Check if user exists
      if (email) {
        user = await authStorage.getUserByEmail(email);
      } else if (phoneNumber) {
        user = await authStorage.getUserByPhone(phoneNumber);
      }
      
      if (googleId) {
        const googleUser = await authStorage.getUserByGoogleId(googleId);
        if (googleUser) user = googleUser;
      }

      // Create new user if doesn't exist
      if (!user) {
        user = await authStorage.createUser({
          email,
          phoneNumber,
          name,
          googleId
        });
      }

      // Set session
      req.session.userId = user.id;
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          isSubscribed: user.isSubscribed
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await authStorage.getUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        name: user.name,
        isSubscribed: user.isSubscribed,
        subscriptionExpiry: user.subscriptionExpiry
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // UPI Payment routes
  app.post("/api/payments/create-upi", requireAuth, async (req: any, res) => {
    try {
      const { paymentMethod } = req.body;
      const userId = req.session.userId;
      
      // Create UPI payment record
      const payment = await authStorage.createUpiPayment({
        userId,
        amount: 1100, // INR 11 in paise
        upiTransactionId: `UPI_${Date.now()}_${userId}`,
        status: 'pending',
        paymentMethod: paymentMethod || 'UPI'
      });

      // Generate UPI payment URL (this would integrate with actual UPI gateway)
      const upiUrl = `upi://pay?pa=merchant@upi&pn=StockNewsIndia&am=11.00&cu=INR&tn=Premium Subscription&tr=${payment.upiTransactionId}`;
      
      res.json({
        success: true,
        paymentId: payment.id,
        upiUrl,
        amount: 11,
        transactionId: payment.upiTransactionId
      });
    } catch (error) {
      console.error("Create UPI payment error:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post("/api/payments/verify", requireAuth, async (req: any, res) => {
    try {
      const { paymentId, upiTransactionId } = req.body;
      const userId = req.session.userId;

      // In a real implementation, you would verify the payment with UPI gateway
      // For now, we'll simulate successful payment verification
      
      // Update payment status
      await authStorage.updatePaymentStatus(paymentId, 'completed', upiTransactionId);
      
      // Update user subscription (1 month from now)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      await authStorage.updateSubscription(userId, true, expiryDate);
      
      res.json({
        success: true,
        message: "Payment verified and subscription activated",
        subscriptionExpiry: expiryDate
      });
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  // Read Later routes
  app.get("/api/read-later", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const readLaterItems = await authStorage.getReadLater(userId);
      res.json(readLaterItems);
    } catch (error) {
      console.error("Get read later error:", error);
      res.status(500).json({ message: "Failed to get read later items" });
    }
  });

  app.post("/api/read-later", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { articleId } = req.body;
      
      const readLaterItem = await authStorage.addToReadLater({
        userId,
        articleId
      });
      
      res.json(readLaterItem);
    } catch (error) {
      console.error("Add to read later error:", error);
      res.status(500).json({ message: "Failed to add to read later" });
    }
  });

  app.delete("/api/read-later/:articleId", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const articleId = parseInt(req.params.articleId);
      
      await authStorage.removeFromReadLater(userId, articleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove from read later error:", error);
      res.status(500).json({ message: "Failed to remove from read later" });
    }
  });

  // Translation endpoint with OpenAI and fallback
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "Text and target language are required" });
      }

      // Try OpenAI first for high-quality translation
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are a professional translator specializing in financial and stock market content. Translate the given text to ${targetLanguage === "hi" ? "Hindi (Devanagari script)" : "English"} while maintaining the financial terminology and context. Keep stock symbols, percentages, and numbers in their original format. Provide natural, fluent translations that sound native.`
            },
            {
              role: "user",
              content: `Translate this financial text to ${targetLanguage === "hi" ? "Hindi" : "English"}: "${text}"`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        });

        const translatedText = response.choices[0].message.content;
        return res.json({ translatedText });
      } catch (aiError: any) {
        console.log("OpenAI translation failed:", aiError.message);
        return res.json({ translatedText: text }); // Return original text if OpenAI fails
      }
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  // OpenAI translation function - ONLY source for translation
  async function translateWithOpenAI(text: string, targetLanguage: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error("OpenAI API key not found in environment");
      throw new Error("OpenAI API key not found");
    }

    console.log(`Translating "${text}" to ${targetLanguage} using OpenAI`);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o", // Using latest model for better translation quality
          messages: [
            {
              role: "system",
              content: `You are a professional Hindi translator specializing in Indian financial and stock market terminology. Translate the given English text to Hindi (Devanagari script) while preserving the meaning and context. Keep numbers, percentages, and stock symbols unchanged. Provide only the Hindi translation without any explanations or additional text.`
            },
            {
              role: "user",
              content: `Translate this to Hindi: "${text}"`
            }
          ],
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error ${response.status}:`, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content?.trim() || text;
      console.log(`Translation result: "${translatedText}"`);
      return translatedText;
    } catch (error) {
      console.error("OpenAI translation error:", error);
      throw error;
    }
  }

  function translateToHindi(text: string): string {
    let translatedText = text;
    
    // Handle specific patterns first (most specific to least specific)
    const specificPatterns = [
      { pattern: /breaks out of (\d+)-year consolidation/gi, replacement: '$1 साल के कंसॉलिडेशन से ब्रेकआउट' },
      { pattern: /breaks out of consolidation/gi, replacement: 'कंसॉलिडेशन से ब्रेकआउट' },
      { pattern: /breaks out/gi, replacement: 'ब्रेकआउट हुआ' },
      { pattern: /hits new record high/gi, replacement: 'नया रिकॉर्ड ऊंचा स्तर छूआ' },
      { pattern: /hits record high/gi, replacement: 'रिकॉर्ड ऊंचाई पर पहुंचा' },
      { pattern: /hits new high/gi, replacement: 'नई ऊंचाई छूई' },
      { pattern: /reaches new high/gi, replacement: 'नई ऊंचाई पर पहुंचा' },
      { pattern: /surged above/gi, replacement: 'से ऊपर उछला' },
      { pattern: /jumped above/gi, replacement: 'से ऊपर कूदा' },
      { pattern: /zooms (\d+)%/gi, replacement: '$1% की तेजी' },
      { pattern: /zooms on/gi, replacement: 'पर तेजी से बढ़ा' },
      { pattern: /(\w+) partnership news/gi, replacement: '$1 साझेदारी की खबर' },
      { pattern: /partnership news/gi, replacement: 'साझेदारी की खबर' },
      { pattern: /on news/gi, replacement: 'खबर पर' },
      { pattern: /strong rally/gi, replacement: 'जबरदस्त तेजी' },
      { pattern: /market rally/gi, replacement: 'बाजार में तेजी' },
      { pattern: /banking rally/gi, replacement: 'बैंकिंग में तेजी' },
      { pattern: /pharma rally/gi, replacement: 'फार्मा में तेजी' },
      { pattern: /upper circuit/gi, replacement: 'अपर सर्किट' },
      { pattern: /lower circuit/gi, replacement: 'लोअर सर्किट' },
      { pattern: /52-week high/gi, replacement: '52 सप्ताह का उच्चतम' },
      { pattern: /52-week low/gi, replacement: '52 सप्ताह का निम्नतम' },
      { pattern: /all-time high/gi, replacement: 'सर्वकालिक उच्च' },
      { pattern: /all time high/gi, replacement: 'सर्वकालिक उच्च' },
      { pattern: /strong volume/gi, replacement: 'भारी वॉल्यूम' },
      { pattern: /heavy volume/gi, replacement: 'भारी वॉल्यूम' },
      { pattern: /with volume/gi, replacement: 'वॉल्यूम के साथ' },
      { pattern: /buying interest/gi, replacement: 'खरीदारी में दिलचस्पी' },
      { pattern: /selling pressure/gi, replacement: 'बिक्री का दबाव' }
    ];
    
    // Apply specific patterns
    specificPatterns.forEach(({ pattern, replacement }) => {
      translatedText = translatedText.replace(pattern, replacement);
    });

    // Individual word translations
    const wordTranslations: { [key: string]: string } = {
      // Companies and brands
      "Nifty": "निफ्टी",
      "Sensex": "सेंसेक्स",
      "BSE": "बीएसई",
      "NSE": "एनएसई",
      
      // Financial terms
      "stock": "स्टॉक",
      "stocks": "स्टॉक्स",
      "share": "शेयर",
      "shares": "शेयर्स",
      "market": "बाजार",
      "markets": "बाजारों",
      "price": "कीमत",
      "prices": "कीमतें",
      "value": "मूल्य",
      "trading": "ट्रेडिंग",
      "trade": "ट्रेड",
      "volume": "वॉल्यूम",
      "turnover": "टर्नओवर",
      
      // Movement terms
      "surge": "उछाल",
      "surged": "उछला",
      "rally": "तेजी",
      "rallied": "तेजी दिखाई",
      "jump": "कूद",
      "jumped": "कूदा",
      "rise": "वृद्धि",
      "rose": "बढ़ा",
      "fall": "गिरावट",
      "fell": "गिरा",
      "drop": "गिरावट",
      "dropped": "गिरा",
      
      // Levels and targets
      "high": "उच्च",
      "higher": "अधिक",
      "low": "निम्न",
      "lower": "कम",
      "level": "स्तर",
      "target": "लक्ष्य",
      "resistance": "प्रतिरोध",
      "support": "सहारा",
      
      // Descriptive terms
      "strong": "मजबूत",
      "weak": "कमजोर",
      "positive": "सकारात्मक",
      "negative": "नकारात्मक",
      "bullish": "तेजी भरा",
      "bearish": "मंदी भरा",
      
      // Sectors
      "banking": "बैंकिंग",
      "pharma": "फार्मा",
      "auto": "ऑटो",
      "metal": "मेटल",
      "energy": "एनर्जी",
      "power": "पावर",
      "realty": "रियल्टी",
      "FMCG": "एफएमसीजी",
      "telecom": "टेलीकॉम",
      
      // Time and numbers
      "percent": "प्रतिशत",
      "percentage": "प्रतिशत",
      "points": "पॉइंट्स",
      "point": "पॉइंट",
      "rupees": "रुपये",
      "crores": "करोड़",
      "today": "आज",
      "yesterday": "कल",
      "week": "सप्ताह",
      "month": "महीना",
      "year": "साल",
      
      // Common connectors
      "and": "और",
      "with": "के साथ",
      "after": "के बाद",
      "before": "से पहले",
      "during": "के दौरान",
      "above": "से ऊपर",
      "below": "से नीचे",
      "over": "से अधिक",
      "under": "से कम",
      "on": "पर",
      "at": "में",
      "for": "के लिए",
      "to": "को",
      "from": "से",
      
      // News and events
      "news": "खबर",
      "announcement": "घोषणा",
      "partnership": "साझेदारी",
      "deal": "डील",
      "agreement": "समझौता",
      "contract": "अनुबंध",
      "launch": "लॉन्च",
      "expansion": "विस्तार",
      "acquisition": "अधिग्रहण",
      "merger": "विलय",
      
      // Technology terms
      "EV": "ईवी",
      "electric": "इलेक्ट्रिक",
      "vehicle": "वाहन",
      "technology": "तकनीक",
      "digital": "डिजिटल",
      "AI": "एआई",
      "blockchain": "ब्लॉकचेन"
    };

    // Replace individual words
    Object.entries(wordTranslations).forEach(([english, hindi]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, hindi);
    });

    // Clean up extra spaces
    translatedText = translatedText.replace(/\s+/g, ' ').trim();

    return translatedText;
  }

  // Sync Google Sheets
  app.post("/api/sync-sheets", async (req, res) => {
    try {
      await storage.forceSyncFromGoogleSheets();
      res.json({ message: "Google Sheets sync triggered successfully" });
    } catch (error) {
      console.error("Sync sheets error:", error);
      res.status(500).json({ message: "Failed to sync Google Sheets" });
    }
  });

  // Get articles
  app.get("/api/articles", async (req, res) => {
    try {
      const category = req.query.category as string;
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Get articles error:", error);
      res.status(500).json({ message: "Failed to get articles" });
    }
  });



  // Get single article
  app.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  // Track article view (for when user swipes to/views an article)
  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementViewCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Track view error:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Get bookmarks
  app.get("/api/bookmarks", async (req, res) => {
    try {
      const bookmarks = await storage.getBookmarks();
      res.json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  // Add bookmark
  app.post("/api/bookmarks", async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.addBookmark(bookmarkData);
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bookmark data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add bookmark" });
    }
  });

  // Remove bookmark
  app.delete("/api/bookmarks/:articleId", async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      await storage.removeBookmark(articleId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove bookmark" });
    }
  });

  // Check if article is bookmarked
  app.get("/api/bookmarks/:articleId/check", async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const isBookmarked = await storage.isBookmarked(articleId);
      res.json({ isBookmarked });
    } catch (error) {
      res.status(500).json({ message: "Failed to check bookmark status" });
    }
  });

  // Add test article (for demonstrating new article notifications)
  app.post("/api/articles/test", async (req, res) => {
    try {
      const newArticle = await storage.addTestArticle();
      res.status(201).json(newArticle);
    } catch (error) {
      res.status(500).json({ message: "Failed to add test article" });
    }
  });

  // OpenAI translation endpoint
  app.post("/api/translate-openai", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "Text and target language are required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        console.log("OpenAI API key not found, returning original text");
        return res.json({ translatedText: text });
      }

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are a professional translator specializing in financial and stock market content. Translate the given text to ${targetLanguage === "hi" ? "Hindi (Devanagari script)" : "English"} while maintaining the financial terminology and context. Keep stock symbols, percentages, and numbers in their original format. Provide natural, fluent translations that sound native. Return only the translation without any explanations.`
            },
            {
              role: "user",
              content: `Translate this to ${targetLanguage === "hi" ? "Hindi" : "English"}: "${text}"`
            }
          ],
          max_tokens: 1000,
          temperature: 0.2
        });

        const translatedText = response.choices[0].message.content?.trim() || text;
        return res.json({ translatedText });
      } catch (aiError: any) {
        console.log("OpenAI translation failed:", aiError.message);
        return res.json({ translatedText: text });
      }
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  // Record article view for analytics
  app.post("/api/article-views", async (req, res) => {
    try {
      const viewData = insertArticleViewSchema.parse(req.body);
      const view = await authStorage.recordArticleView(viewData);
      res.json(view);
    } catch (error) {
      console.error('Error recording article view:', error);
      res.status(500).json({ error: 'Failed to record article view' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
