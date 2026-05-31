import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Oracle Knowledge table for persistent knowledge storage
export const oracleKnowledge = pgTable("oracle_knowledge", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // "pdf" | "url" | "text"
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  addedAt: timestamp("added_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  chunks: text("chunks").array().notNull(),
});

export const insertOracleKnowledgeSchema = createInsertSchema(oracleKnowledge).omit({
  addedAt: true,
});

export type OracleKnowledge = typeof oracleKnowledge.$inferSelect;
export type InsertOracleKnowledge = z.infer<typeof insertOracleKnowledgeSchema>;

