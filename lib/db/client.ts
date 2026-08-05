import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

let database: NeonHttpDatabase<typeof schema> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb() {
  if (!database) {
    const url = process.env.DATABASE_URL?.trim();

    if (!url) {
      throw new Error("DATABASE_URL is required. Add Neon to this Vercel project first.");
    }

    database = drizzle({ client: neon(url), schema });
  }

  return database;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function isDatabaseSchemaReady() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    return false;
  }

  try {
    const sql = neon(url);
    const rows = (await sql`
      select
        to_regclass('public.chat') is not null as chat_ready,
        to_regclass('public.chat_event') is not null as chat_event_ready
    `) as unknown as [
      {
        readonly chat_event_ready: boolean;
        readonly chat_ready: boolean;
      },
    ];
    const result = rows[0];
    const ready = Boolean(result?.chat_ready && result.chat_event_ready);

    return ready;
  } catch {
    return false;
  }
}
