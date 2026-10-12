import { readFileSync } from "node:fs";
import path from "node:path";

const NEXT_ACTION_HEADER = "next-action";
const SERVER_ACTION_ID_PATTERN = /^[0-9a-f]{42}$/;

export type ServerActionIds = ReadonlySet<string> | null;

export function isServerActionId(id: string) {
  return SERVER_ACTION_ID_PATTERN.test(id);
}

/**
 * Reads the ids of every server action in this build. Returns null when the
 * manifest isn't readable so callers fall back to format-only validation.
 */
export function loadServerActionIds(
  distDir = path.join(process.cwd(), ".next"),
): ServerActionIds {
  try {
    const manifest = JSON.parse(
      readFileSync(path.join(distDir, "server", "server-reference-manifest.json"), "utf8"),
    ) as { node?: Record<string, unknown>; edge?: Record<string, unknown> };

    return new Set([...Object.keys(manifest.node ?? {}), ...Object.keys(manifest.edge ?? {})]);
  } catch {
    return null;
  }
}

/**
 * With `cacheComponents`, Next.js answers a server action it can't resolve by
 * resuming the page's postponed state with the not-found tree, which throws
 * "Couldn't find all resumable slots" on every such request (OTTERCHAT-3).
 * Requests whose action id is malformed, or absent from this build, are
 * detected here so they can be rejected before rendering starts. Ids are
 * compared exactly, as Next.js looks them up without normalizing.
 */
export function isUnresolvableServerActionRequest(
  request: Request,
  knownIds: ServerActionIds,
) {
  if (request.method !== "POST") {
    return false;
  }

  const actionId = request.headers.get(NEXT_ACTION_HEADER) ?? undefined;

  if (actionId === undefined) {
    return false;
  }

  if (!isServerActionId(actionId)) {
    return true;
  }

  return knownIds !== null && !knownIds.has(actionId);
}
