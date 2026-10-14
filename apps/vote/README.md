# ottervote (`apps/vote`)

Public A/B voting app that collects human preference pairs for the pet LoRA in
`otterimage/`. Votes are the judge signal a later DPO run trains on.

```
generation job ──POST /api/pairs──► vote_pair ──► voting screen ──► vote
                                                                     │
                                  DPO trainer ◄──GET /api/export─────┘
```

Design system, tokens and primitives come from `@otterchat/ui`, shared with
`apps/chat`.

## Local development

```bash
cp apps/vote/.env.example apps/vote/.env.local   # fill DATABASE_URL, INGEST_TOKEN
pnpm install
pnpm --filter ottervote db:migrate
pnpm --filter ottervote db:seed                  # sample pairs, remove once real ones exist
pnpm --filter ottervote dev                      # http://localhost:3100
```

`DATABASE_URL` points at the vote app's own Neon database, separate from
otterchat's.

## Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `/` | public | Vote A / B / tie / skip. Keys: `←`, `→`, `T`, `S`. |
| `/stats` | public | Win rate per LoRA version, votes per day, decisive-pair count. |
| `GET /api/next-pair?limit=` | voter cookie | Pairs this voter has not judged. |
| `POST /api/vote` | voter cookie | `{ pairId, choice }`, one vote per voter per pair. |
| `POST /api/pairs` | `Bearer $INGEST_TOKEN` | `{ pairs: [{ prompt, loraVersion, imageAUrl, imageBUrl, ... }] }`. |
| `GET /api/export?loraVersion=` | `Bearer $INGEST_TOKEN` | Winner/loser pairs for the DPO trainer. |

Voter identity is an anonymous `otter_voter` cookie issued by `proxy.ts`. It
deduplicates votes; it does not authenticate anyone, so treat vote counts from a
public link accordingly.
