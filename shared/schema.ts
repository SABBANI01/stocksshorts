import { pgTable, text, serial, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  name: varchar("name", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }),
  isSubscribed: boolean("is_subscribed").default(false).notNull(),
  subscriptionExpiry: timestamp("subscription_expiry"),
  upiTransactionId: varchar("upi_transaction_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  titleHi: text("title_hi"), // Hindi translation
  contentHi: text("content_hi"), // Hindi translation
  category: text("category").notNull(), // 'nifty', 'breakout', 'movers', 'order_wins', 'warrant', 'ath', 'results', 'others', 'general'
  stockSymbol: text("stock_symbol"),
  stockPrice: text("stock_price"),
  priceChange: text("price_change"),
  exchange: text("exchange"), // 'NSE', 'BSE'
  imageUrl: text("image_url").notNull(),
  timeAgo: text("time_ago").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(), // true for warrant and breakout
  createdAt: timestamp("created_at").defaultNow().notNull(),
  source: text("source"),
  sentiment: text("sentiment"), // 'bullish', 'bearish', 'neutral'
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  articleId: integer("article_id").notNull().references(() => articles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const readLater = pgTable("read_later", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  articleId: integer("article_id").notNull().references(() => articles.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const upiPayments = pgTable("upi_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // in paise (INR 11 = 1100 paise)
  upiTransactionId: varchar("upi_transaction_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, completed, failed
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(), // UPI app name
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertReadLaterSchema = createInsertSchema(readLater).omit({
  id: true,
  createdAt: true,
});

export const insertUpiPaymentSchema = createInsertSchema(upiPayments).omit({
  id: true,
  createdAt: true,
});

export const articleViews = pgTable("article_views", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id).notNull(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  timeSpent: integer("time_spent").notNull(), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertArticleViewSchema = createInsertSchema(articleViews).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertReadLater = z.infer<typeof insertReadLaterSchema>;
export type ReadLater = typeof readLater.$inferSelect;
export type InsertUpiPayment = z.infer<typeof insertUpiPaymentSchema>;
export type UpiPayment = typeof upiPayments.$inferSelect;
export type InsertArticleView = z.infer<typeof insertArticleViewSchema>;
export type ArticleView = typeof articleViews.$inferSelect;
