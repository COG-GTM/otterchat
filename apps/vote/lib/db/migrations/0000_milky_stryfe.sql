CREATE TABLE "vote" (
	"id" text PRIMARY KEY NOT NULL,
	"pair_id" text NOT NULL,
	"voter_id" text NOT NULL,
	"choice" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote_pair" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"lora_version" text NOT NULL,
	"source" text DEFAULT 'sample' NOT NULL,
	"image_a_url" text NOT NULL,
	"image_b_url" text NOT NULL,
	"image_a_meta" jsonb,
	"image_b_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_pair_id_vote_pair_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."vote_pair"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vote_pair_voter" ON "vote" USING btree ("pair_id","voter_id");--> statement-breakpoint
CREATE INDEX "idx_vote_created" ON "vote" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_vote_pair_lora_created" ON "vote_pair" USING btree ("lora_version","created_at");