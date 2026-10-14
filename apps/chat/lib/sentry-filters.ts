import type { Event, StackFrame } from "@sentry/nextjs";

// Vercel injects its Live/Comments feedback script (vercel.live/_next-live/...)
// into preview deployments. Errors it throws are third-party noise, not otterchat bugs.
const VERCEL_LIVE_FRAME = /\/_next-live\/|vercel\.live/;

const framePath = (frame: StackFrame) => frame.abs_path ?? frame.filename;

// Sentry orders frames oldest-first, so the last frame with a path is where the error was thrown.
function throwSite(frames: StackFrame[]): StackFrame | undefined {
  return [...frames].reverse().find((frame) => typeof framePath(frame) === "string");
}

// True only when every exception in the event was thrown from the Vercel Live script,
// so first-party errors (including ones linked to or called from the script) are kept.
export function isVercelLiveToolbarEvent(event: Event): boolean {
  const throwSites = (event.exception?.values ?? [])
    .map((exception) => throwSite(exception.stacktrace?.frames ?? []))
    .filter((frame) => frame !== undefined);
  return (
    throwSites.length > 0 &&
    throwSites.every((frame) =>
      [frame.filename, frame.abs_path].some(
        (path) => typeof path === "string" && VERCEL_LIVE_FRAME.test(path),
      ),
    )
  );
}

export function beforeSend<T extends Event>(event: T): T | null {
  return isVercelLiveToolbarEvent(event) ? null : event;
}
