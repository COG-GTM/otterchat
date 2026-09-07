# Review rules

Repository-specific things to check on every pull request, in addition to normal review.

## Feature flags on automation-authored PRs

This rule applies **only to PRs opened by a Devin Automation** — a scheduled or
event-triggered session with no human driving it. A PR opened from an interactive session,
or by a person, is exempt: a human is already deciding when the change goes live.

Signals that a PR is automation-authored: it was created by the Devin bot account from a
scheduled/triggered run, its description or linked session shows no interactive requester,
and the branch was not requested by a person in the session transcript.

For those PRs, if the diff adds or changes user-facing behavior — a new page, route
handler, component, server action, or a change to what existing UI does — flag it unless
all of the following hold:

- The new behavior is gated by a LaunchDarkly boolean evaluated through
  `boolVariation` from `apps/chat/lib/launchdarkly.ts`. No other flag system, and no new
  LaunchDarkly client.
- The default passed to `boolVariation` is `false`. A default of `true` is never an
  acceptable rollout guard.
- The flag-off branch preserves the behavior that exists on `main` today.
- The flag is evaluated on the server. `boolVariation` must not be called from a client
  component; the value is passed down as a prop instead.
- The gated server component sits inside a `<Suspense>` boundary, because `cacheComponents`
  is enabled in `apps/chat/next.config.ts` and flag evaluation is dynamic.
- The flag key is kebab-case, unique to this feature, and named in the PR description
  along with its default.
- Persisted data written behind the flag stays readable with the flag off.

Pure refactors, dependency bumps, docs, tests, and build/config changes are not features and
do not need a flag.

See `.agents/skills/new-feature-requirements/SKILL.md` for the authoring workflow.

## Rate limiting

The app deliberately has no request rate limiting: Upstash Redis was removed, and the
anonymous-usage gate is client-side only. Do not raise this as a finding on its own — it is a
known, accepted tradeoff. Do flag a change that makes the exposure meaningfully worse, such
as a new unauthenticated endpoint that reaches the model.
