import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const VOTE_CHOICES = ["a", "b", "tie", "skip"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export type ImageMeta = {
  readonly guidanceScale?: number;
  readonly numInferenceSteps?: number;
  readonly seed?: number;
};

export const votePair = pgTable(
  "vote_pair",
  {
    id: text("id").primaryKey(),
    prompt: text("prompt").notNull(),
    loraVersion: text("lora_version").notNull(),
    source: text("source").notNull().default("sample"),
    imageAUrl: text("image_a_url").notNull(),
    imageBUrl: text("image_b_url").notNull(),
    imageAMeta: jsonb("image_a_meta").$type<ImageMeta | null>(),
    imageBMeta: jsonb("image_b_meta").$type<ImageMeta | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_vote_pair_lora_created").on(table.loraVersion, table.createdAt)],
);

export const vote = pgTable(
  "vote",
  {
    id: text("id").primaryKey(),
    pairId: text("pair_id")
      .notNull()
      .references(() => votePair.id, { onDelete: "cascade" }),
    voterId: text("voter_id").notNull(),
    choice: text("choice").$type<VoteChoice>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_vote_pair_voter").on(table.pairId, table.voterId),
    index("idx_vote_created").on(table.createdAt),
  ],
);

export type VotePair = typeof votePair.$inferSelect;
export type Vote = typeof vote.$inferSelect;
