import {
  articles,
  bookmarks,
  users,
  readLater,
  upiPayments,
  articleViews,
  type Article,
  type InsertArticle,
  type Bookmark,
  type InsertBookmark,
  type User,
  type InsertUser,
  type ReadLater,
  type InsertReadLater,
  type UpiPayment,
  type InsertUpiPayment,
  type ArticleView,
  type InsertArticleView,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql, avg } from "drizzle-orm";

export interface IAuthStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  
  // Subscription management
  updateSubscription(userId: number, isSubscribed: boolean, expiryDate?: Date): Promise<User>;
  isUserSubscribed(userId: number): Promise<boolean>;
  
  // Article management
  getArticles(category?: string, userId?: number): Promise<Article[]>;
  getArticle(id: number): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  
  // Bookmark management
  getBookmarks(userId: number): Promise<Bookmark[]>;
  addBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  removeBookmark(userId: number, articleId: number): Promise<void>;
  isBookmarked(userId: number, articleId: number): Promise<boolean>;
  
  // Read Later management
  getReadLater(userId: number): Promise<ReadLater[]>;
  addToReadLater(readLater: InsertReadLater): Promise<ReadLater>;
  removeFromReadLater(userId: number, articleId: number): Promise<void>;
  isInReadLater(userId: number, articleId: number): Promise<boolean>;
  
  // UPI Payment management
  createUpiPayment(payment: InsertUpiPayment): Promise<UpiPayment>;
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<UpiPayment>;
  getUserPayments(userId: number): Promise<UpiPayment[]>;
  
  // Article Analytics
  recordArticleView(view: InsertArticleView): Promise<ArticleView>;
  getTrendingArticles(): Promise<Article[]>;
}

export class DatabaseStorage implements IAuthStorage {
  // User management
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Subscription management
  async updateSubscription(userId: number, isSubscribed: boolean, expiryDate?: Date): Promise<User> {
    const [user] = await db.update(users)
      .set({
        isSubscribed,
        subscriptionExpiry: expiryDate
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async isUserSubscribed(userId: number): Promise<boolean> {
    const [user] = await db.select({ 
      isSubscribed: users.isSubscribed, 
      subscriptionExpiry: users.subscriptionExpiry 
    })
    .from(users)
    .where(eq(users.id, userId));
    
    if (!user) return false;
    
    if (!user.isSubscribed) return false;
    
    // Check if subscription is still valid
    if (user.subscriptionExpiry && new Date() > user.subscriptionExpiry) {
      // Subscription expired, update user
      await this.updateSubscription(userId, false);
      return false;
    }
    
    return true;
  }

  // Article management
  async getArticles(category?: string, userId?: number): Promise<Article[]> {
    try {
      if (category === 'trending') {
        return await this.getTrendingArticles();
      }
      
      let query = db.select().from(articles);
      
      if (category && category !== 'all') {
        query = query.where(eq(articles.category, category));
      }
      
      const allArticles = await query.orderBy(desc(articles.createdAt));
      
      // If user is not provided or not subscribed, filter out premium content
      if (!userId || !(await this.isUserSubscribed(userId))) {
        return allArticles.filter(article => !article.isPremium);
      }
      
      return allArticles;
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article;
  }

  async createArticle(articleData: InsertArticle): Promise<Article> {
    // Set isPremium to true for warrant and breakout categories
    const isPremium = articleData.category === 'warrant' || articleData.category === 'breakout';
    
    const [article] = await db.insert(articles)
      .values({ ...articleData, isPremium })
      .returning();
    return article;
  }

  // Bookmark management
  async getBookmarks(userId: number): Promise<Bookmark[]> {
    return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId));
  }

  async addBookmark(bookmarkData: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db.insert(bookmarks).values(bookmarkData).returning();
    return bookmark;
  }

  async removeBookmark(userId: number, articleId: number): Promise<void> {
    await db.delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
  }

  async isBookmarked(userId: number, articleId: number): Promise<boolean> {
    const [bookmark] = await db.select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
    return !!bookmark;
  }

  // Read Later management
  async getReadLater(userId: number): Promise<ReadLater[]> {
    return await db.select().from(readLater).where(eq(readLater.userId, userId));
  }

  async addToReadLater(readLaterData: InsertReadLater): Promise<ReadLater> {
    const [item] = await db.insert(readLater).values(readLaterData).returning();
    return item;
  }

  async removeFromReadLater(userId: number, articleId: number): Promise<void> {
    await db.delete(readLater)
      .where(and(eq(readLater.userId, userId), eq(readLater.articleId, articleId)));
  }

  async isInReadLater(userId: number, articleId: number): Promise<boolean> {
    const [item] = await db.select()
      .from(readLater)
      .where(and(eq(readLater.userId, userId), eq(readLater.articleId, articleId)));
    return !!item;
  }

  // UPI Payment management
  async createUpiPayment(paymentData: InsertUpiPayment): Promise<UpiPayment> {
    const [payment] = await db.insert(upiPayments).values(paymentData).returning();
    return payment;
  }

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<UpiPayment> {
    const updateData: any = { status };
    if (transactionId) {
      updateData.upiTransactionId = transactionId;
    }
    
    const [payment] = await db.update(upiPayments)
      .set(updateData)
      .where(eq(upiPayments.id, id))
      .returning();
    return payment;
  }

  async getUserPayments(userId: number): Promise<UpiPayment[]> {
    return await db.select()
      .from(upiPayments)
      .where(eq(upiPayments.userId, userId))
      .orderBy(desc(upiPayments.createdAt));
  }

  async recordArticleView(viewData: InsertArticleView): Promise<ArticleView> {
    try {
      const [view] = await db
        .insert(articleViews)
        .values(viewData)
        .returning();
      
      return view;
    } catch (error) {
      console.error('Error recording article view:', error);
      throw error;
    }
  }

  async getTrendingArticles(): Promise<Article[]> {
    try {
      // For now, return recent articles since analytics table is empty
      return await db
        .select()
        .from(articles)
        .orderBy(desc(articles.createdAt))
        .limit(20);
    } catch (error) {
      console.error('Error fetching trending articles:', error);
      // Fallback to recent articles if trending fails
      return await db
        .select()
        .from(articles)
        .orderBy(desc(articles.createdAt))
        .limit(20);
    }
  }
}

export const authStorage = new DatabaseStorage();