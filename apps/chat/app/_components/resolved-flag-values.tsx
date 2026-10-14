import { encryptFlagValues } from "flags";
import { evaluate, type Flag } from "flags/next";
import { FlagValues } from "flags/react";
import { connection } from "next/server";
import * as flags from "@/lib/flags";

export async function ResolvedFlagValues() {
  if (!process.env.FLAGS_SECRET) {
    return null;
  }

  const declarations = Object.values<Flag<boolean>>(flags);
  if (declarations.length === 0) {
    return null;
  }

  // encryptFlagValues reads the current time, which Cache Components forbids during prerender.
  await connection();
  const values = await evaluate(declarations);
  const resolved = Object.fromEntries(
    declarations.map((declaration, index) => [declaration.key, values[index]]),
  );

  return <FlagValues values={await encryptFlagValues(resolved)} />;
}
