#!/usr/bin/env bash
# One-shot setup: link Vercel, provision Neon + Auth, set and pull env, run migrations.
# Usage (repo root): ./scripts/setup.sh [team-slug | --scope <team-slug>]
set -euo pipefail

step() { printf '\n\033[1;36m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m !\033[0m %s\n' "$1"; }
bold() { printf '\033[1m%s\033[0m\n' "$1"; }

for cmd in vercel node pnpm openssl; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required command: $cmd"; exit 1; }
done

NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "eve requires Node.js 24 or newer. You are running $(node -v). Please upgrade Node.js and try again."
  exit 1
fi

TEAM_SCOPE=""
case "${1:-}" in
  --scope) TEAM_SCOPE="${2:-}" ;;
  --scope=*) TEAM_SCOPE="${1#--scope=}" ;;
  -*) ;;
  ?*) TEAM_SCOPE="$1" ;;
esac
SCOPE_FLAGS=""
[ -n "$TEAM_SCOPE" ] && SCOPE_FLAGS="--scope $TEAM_SCOPE"

step "Installing dependencies"
pnpm install

step "Linking Vercel project"
if [ ! -f .vercel/project.json ]; then
  vercel link $SCOPE_FLAGS
fi
PROJECT_ID=$(node -e 'console.log(require("./.vercel/project.json").projectId)')
TEAM_ID=$(node -e 'console.log(require("./.vercel/project.json").orgId)')

# json_field FIELD_PATH — read JSON from stdin and print a dotted field (or "").
json_field() {
  node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const o=JSON.parse(s);console.log(process.argv[1].split(".").reduce((a,k)=>(a&&a[k]!=null)?a[k]:undefined,o)??"")}catch{console.log("")}})' "$1"
}

# api_get PATH — team-scoped GET; prints "" on failure instead of aborting
api_get() { vercel api "$1" $SCOPE_FLAGS 2>/dev/null || true; }

if [ -n "$TEAM_SCOPE" ]; then
  TEAM_SLUG="$TEAM_SCOPE"
else
  TEAM_SLUG=$(api_get "/v2/teams/$TEAM_ID" | json_field slug)
  [ -n "$TEAM_SLUG" ] && SCOPE_FLAGS="--scope $TEAM_SLUG"
fi
PROJECT_SLUG=$(api_get "/v9/projects/$PROJECT_ID" | json_field name)
[ -n "$PROJECT_SLUG" ] && echo "  project: $PROJECT_SLUG${TEAM_SLUG:+  (team: $TEAM_SLUG)}"

# set_env KEY VALUE TYPE TARGETS_JSON — upsert via the API (no vercel env add branch prompt)
set_env() {
  node -e 'const [k,v,t,tg]=process.argv.slice(1);process.stdout.write(JSON.stringify({key:k,value:v,type:t,target:JSON.parse(tg)}))' \
    "$1" "$2" "$3" "$4" \
    | vercel api "/v10/projects/$PROJECT_ID/env?upsert=true" $SCOPE_FLAGS -X POST --input - >/dev/null
  echo "  set $1"
}

# provision_integration LABEL SLUG ENV_MARKER — install a Marketplace integration unless ENV_MARKER is set
provision_integration() {
  local label="$1" slug="$2" marker="$3"
  if vercel env ls $SCOPE_FLAGS 2>/dev/null | grep -q "$marker"; then
    echo "  $marker already present, skipping"
    return
  fi
  vercel integration add "$slug" $SCOPE_FLAGS || true
  if ! vercel env ls $SCOPE_FLAGS 2>/dev/null | grep -q "$marker"; then
    warn "$label needs additional setup in the browser — finish connecting it to this project."
    warn "Then re-run this script to continue (completed steps are detected and skipped)."
    exit 0
  fi
}

step "Provisioning Neon Postgres"
provision_integration "Neon" neon DATABASE_URL

step "Configuring Neon Auth"
if ! vercel env ls $SCOPE_FLAGS 2>/dev/null | grep -q 'NEON_AUTH_BASE_URL'; then
  warn "NEON_AUTH_BASE_URL is not set. Enable Auth for this project's branch in the"
  warn "Neon console (Project -> Branch -> Auth), then re-run this script."
fi
if vercel env ls $SCOPE_FLAGS 2>/dev/null | grep -q 'NEON_AUTH_COOKIE_SECRET'; then
  echo "  NEON_AUTH_COOKIE_SECRET already set, skipping"
else
  set_env NEON_AUTH_COOKIE_SECRET "$(openssl rand -base64 32)" encrypted '["production","preview","development"]'
fi

step "Pulling environment variables to .env.local"
vercel env pull .env.local --yes
if ! grep -q '^NEON_AUTH_BASE_URL=' .env.local 2>/dev/null; then
  warn "NEON_AUTH_BASE_URL is missing from .env.local. Enable Auth for the branch in"
  warn "the Neon console, then run 'vercel env pull .env.local --yes' again."
fi

if ! grep -q '^DATABASE_URL=' .env.local 2>/dev/null; then
  warn "DATABASE_URL is not in .env.local — Neon marks it sensitive and enables it"
  warn "for Production/Preview only, so it is not pulled. Enable it for the"
  warn "Development environment in the dashboard, or paste the Neon connection string."
  read -r -p "Paste DATABASE_URL (leave empty to skip migrations): " DBURL
  if [ -n "$DBURL" ]; then
    grep -v '^DATABASE_URL=' .env.local > .env.local.tmp 2>/dev/null || true
    mv -f .env.local.tmp .env.local 2>/dev/null || true
    echo "DATABASE_URL=$DBURL" >> .env.local
  fi
fi

if grep -q '^DATABASE_URL=' .env.local 2>/dev/null; then
  step "Running database migrations"
  set -a; . ./.env.local; set +a
  pnpm db:migrate
else
  warn "Skipping migrations — DATABASE_URL missing. Run 'pnpm db:migrate' after setting it."
fi

step "Setup complete"
bold "Start the app:  pnpm dev"
