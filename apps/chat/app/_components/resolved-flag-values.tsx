import { encryptFlagValues } from "flags";
import { evaluate, type Flag } from "flags/next";
import { FlagValues } from "flags/react";
import * as flags from "@/lib/flags";

export async function ResolvedFlagValues() {
  if (!process.env.FLAGS_SECRET) {
    return null;
  }

  const declarations = Object.values<Flag<boolean>>(flags);
  const values = await evaluate(declarations);
  const resolved = Object.fromEntries(
    declarations.map((declaration, index) => [declaration.key, values[index]]),
  );

  return <FlagValues values={await encryptFlagValues(resolved)} />;
}
