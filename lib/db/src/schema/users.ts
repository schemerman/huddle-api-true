import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    username: text("username").notNull().default(""),
    displayName: text("display_name").notNull().default(""),
    dob: text("dob").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#E8533A"),
    winRate: real("win_rate").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    points: integer("points").notNull().default(1000),
    isBankrupt: boolean("is_bankrupt").notNull().default(false),
    previousWagers: integer("previous_wagers").notNull().default(0),
    lastDailyClaim: timestamp("last_daily_claim", { withTimezone: true }),
    profileComplete: boolean("profile_complete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("users_points_non_negative", sql`${table.points} >= 0`),
  ],
);

export type User = typeof usersTable.$inferSelect;
