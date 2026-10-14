// Scripts Vercel injects into preview deployments (toolbar, comments, live
// feedback) are served from /_next-live/. Sentry's browserApiErrors wraps their
// event listeners too, so their errors otherwise surface as otterchat issues.
export const SENTRY_CLIENT_DENY_URLS: RegExp[] = [/\/_next-live\//];
