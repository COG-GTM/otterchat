// Module resolve hook so `node --test` can import app sources: maps the `@/` tsconfig path
// resolves extensionless imports to .ts/.tsx files, and lets `next/*` subpaths (no exports map) resolve
// the way Next's bundler does.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appRoot = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const isAlias = specifier.startsWith("@/");
  if (!isAlias && !specifier.startsWith(".")) {
    if (/^next\/[^.]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    return nextResolve(specifier, context);
  }

  const url = isAlias ? new URL(specifier.slice(2), appRoot) : new URL(specifier, context.parentURL);
  if (!/\.[cm]?[jt]sx?$/.test(url.pathname)) {
    for (const extension of [".ts", ".tsx"]) {
      if (existsSync(fileURLToPath(`${url.href}${extension}`))) {
        return nextResolve(`${url.href}${extension}`, context);
      }
    }
  }
  return nextResolve(url.href, context);
}
