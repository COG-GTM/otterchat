import type { Event } from "@sentry/nextjs";

// Vercel injects its Live/Comments feedback script (vercel.live/_next-live/...)
// into preview deployments. Errors it throws are third-party noise, not otterchat bugs.
const VERCEL_LIVE_FRAME = /\/_next-live\/|vercel\.live/;

export function isVercelLiveToolbarEvent(event: Event): boolean {
  return (event.exception?.values ?? []).some((exception) =>
    (exception.stacktrace?.frames ?? []).some((frame) =>
      [frame.filename, frame.abs_path].some(
        (path) => typeof path === "string" && VERCEL_LIVE_FRAME.test(path),
      ),
    ),
  );
}

export function beforeSend<T extends Event>(event: T): T | null {
  return isVercelLiveToolbarEvent(event) ? null : event;
}
