import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const wagersTable = pgTable("wagers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  fixtureId: text("fixture_id").notNull(),
  choice: text("choice").notNull(),
  question: text("question").notNull().default(""),
  prediction: text("prediction").notNull().default(""),
  amount: integer("amount").notNull(),
  odds: real("odds").notNull(),
  potentialPayout: integer("potential_payout").notNull(),
  status: text("status").notNull().default("pending"),
  payout: integer("payout").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export type Wager = typeof wagersTable.$inferSelect;
