import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  ownerId: text("owner_id").notNull(),
  memberIds: text("member_ids").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});