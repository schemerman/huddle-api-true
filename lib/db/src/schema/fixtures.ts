import { pgTable, text, real, timestamp, integer } from "drizzle-orm/pg-core";

export const fixturesTable = pgTable("fixtures", {
  id: text("id").primaryKey(),
  competition: text("competition").notNull().default(""),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  oddsHome: real("odds_home").notNull().default(0),
  oddsDraw: real("odds_draw").notNull().default(0),
  oddsAway: real("odds_away").notNull().default(0),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: text("status").notNull().default("pending"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Fixture = typeof fixturesTable.$inferSelect;