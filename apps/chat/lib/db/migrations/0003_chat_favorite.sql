CREATE TABLE "chat_favorite" (
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_favorite_user_id_chat_id_pk" PRIMARY KEY("user_id","chat_id")
);
--> statement-breakpoint
ALTER TABLE "chat_favorite" ADD CONSTRAINT "chat_favorite_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_favorite_user_created" ON "chat_favorite" USING btree ("user_id","created_at");