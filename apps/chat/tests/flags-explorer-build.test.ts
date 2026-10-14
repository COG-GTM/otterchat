import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// Vercel production/preview set FLAGS_SECRET, which is what makes ResolvedFlagValues run during prerender.
const appRoot = fileURLToPath(new URL("../", import.meta.url));
const flagsModule = new URL("../lib/flags.ts", import.meta.url);
const nextBin = fileURLToPath(new URL("../node_modules/.bin/next", import.meta.url));
const port = 3917;
const env = {
  ...process.env,
  FLAGS_SECRET: randomBytes(32).toString("base64url"),
  LAUNCHDARKLY_SDK_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

const oneFlagModule = `import { launchDarklyFlag } from "@/lib/launchdarkly-flag";

export const regressionFlag = launchDarklyFlag({
  key: "otterchat-flags-explorer-regression",
  description: "Declared only by tests/flags-explorer-build.test.ts.",
});
`;

function nextBuild() {
  return new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(nextBin, ["build"], { cwd: appRoot, env });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
  });
}

async function fetchHomeFromNextStart() {
  const server = spawn(nextBin, ["start", "-p", String(port)], { cwd: appRoot, env, detached: true });
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const response = await fetch(`http://localhost:${port}/`);
        return { status: response.status, html: await response.text() };
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error("next start did not accept connections");
  } finally {
    process.kill(-server.pid!, "SIGTERM");
  }
}

function assertBuildSucceeded({ code, output }: { code: number | null; output: string }) {
  assert.doesNotMatch(output, /unstable value `new Date\(\)` while prerendering/);
  assert.equal(code, 0, output.slice(-4000));
}

describe("next build with FLAGS_SECRET set (Vercel production)", { timeout: 600_000 }, () => {
  let originalFlagsModule: string | undefined;

  before(async () => {
    originalFlagsModule = await readFile(flagsModule, "utf8");
  });

  after(async () => {
    if (originalFlagsModule !== undefined) {
      await writeFile(flagsModule, originalFlagsModule);
    }
  });

  it("succeeds with zero flag declarations in lib/flags.ts", async () => {
    await writeFile(flagsModule, "export {};\n");
    assertBuildSucceeded(await nextBuild());
  });

  it("succeeds with one flag declared and renders its encrypted values at request time", async () => {
    await writeFile(flagsModule, oneFlagModule);
    assertBuildSucceeded(await nextBuild());

    const { status, html } = await fetchHomeFromNextStart();
    assert.equal(status, 200);
    assert.match(html, /<script type="application\/json" data-flag-values="true">/);
  });
});
