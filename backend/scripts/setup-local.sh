#!/usr/bin/env bash
# One-shot local setup for Git Bash (or any bash): start the DB container, load the schema if missing,
# then load the seeds. Safe to re-run: every seed removes its own rows first.
#
#   bash backend/scripts/setup-local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

PSQL=(docker compose exec -T db psql -U raser -d raser -v ON_ERROR_STOP=1)

echo "==> Starting the database container"
docker compose up -d

# First start: the postgres image runs schema.sql (docker-compose.yml mounts it into initdb.d) on a temporary
# server that only listens on the unix socket, then restarts. Check over TCP (-h) so we only proceed once the
# final server is up and the schema is loaded.
echo "==> Waiting for Postgres"
ready=0
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -h 127.0.0.1 -U raser -d raser >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ $ready -ne 1 ]]; then
  echo "Postgres did not become ready. Check: docker compose logs db" >&2
  exit 1
fi

echo "==> Schema (docker-compose.yml normally loads it on first start)"
if [[ "$("${PSQL[@]}" -tA -c "SELECT to_regclass('public.account') IS NOT NULL")" == "t" ]]; then
  echo "    tables already exist, skipping schema.sql"
else
  "${PSQL[@]}" < schema.sql
  echo "    schema.sql loaded"
fi

echo "==> Seeds"
for f in seed-example2 seed-reviewer-test; do
  echo "    $f.sql"
  "${PSQL[@]}" < "backend/scripts/$f.sql"
done

cat <<'MSG'

Done. Next:
  1. Backend  (new terminal):  cd backend && <the npm script that runs scripts/local-server.ts>   -> http://localhost:3001
       needs:  export DATABASE_URL=postgres://raser:raser@localhost:5432/raser
  2. Frontend (new terminal):  cd frontend && npm run dev                                          -> http://localhost:5173
  3. API smoke test:           bash backend/scripts/test-reviewer-api.sh

Reviewer links (open in the browser):
  http://localhost:5173/r/rvProg000001   PIN 042817   InProgress, 4 answers saved
  http://localhost:5173/r/rvFresh00001   PIN 135790   fresh link (flips to InProgress)
  http://localhost:5173/r/rvDone000001   PIN 246810   Completed, read-only + report
  http://localhost:5173/r/rvWdrn000001   PIN 111111   withdrawn paper -> "no longer valid"
  http://localhost:5173/r/exTokenBob01   PIN 222222   Example Journal reviewer (bob), no answers
  http://localhost:5173/r/exTokenDave1   PIN 333333   Example Journal reviewer (dave), fresh

Start over completely:  npm run db:down -- -v && npm run db:up   (then run this script again)

Editor logins (/editor/login):  example2@gmail.com / password     editor-test@example.org / password123
MSG
