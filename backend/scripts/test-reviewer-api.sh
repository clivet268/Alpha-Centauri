#!/usr/bin/env bash
# Smoke-test /review/access and /review/answer against seed-reviewer-test.sql.
# Usage:  bash backend/scripts/test-reviewer-api.sh        (API defaults to http://localhost:3001; override with API=...)
#         Backend must be running (local-server.ts) and the seeds loaded.
set -u
API="${API:-http://localhost:3001}"   # local-server.ts default
pass=0; fail=0

# call <name> <expected-status> <path> <json-body> [jq-ish substring expected in body]
call() {
  local name="$1" want="$2" path="$3" body="$4" contains="${5:-}"
  local out status resp
  out=$(curl -s -w '\n%{http_code}' -X POST "$API$path" -H 'Content-Type: application/json' -d "$body")
  status=${out##*$'\n'}; resp=${out%$'\n'*}
  if [[ "$status" == "$want" && ( -z "$contains" || "$resp" == *"$contains"* ) ]]; then
    echo "PASS  $name ($status)"; pass=$((pass+1))
  else
    echo "FAIL  $name: want $want${contains:+ containing '$contains'}, got $status"; echo "      $resp"; fail=$((fail+1))
  fi
}

TOK=rvProg000001; PIN=042817

echo "--- access ---"
call "in-progress review loads"      200 /review/access "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\"}" '"status":"InProgress"'
call "wrong PIN"                     401 /review/access "{\"reviewToken\":\"$TOK\",\"pin\":\"000000\"}" 'INVALID_PIN'
call "PIN not 6 digits"              400 /review/access "{\"reviewToken\":\"$TOK\",\"pin\":\"12\"}" 'pin must be a 6-digit string.'
call "unknown token"                 404 /review/access '{"reviewToken":"nopenopenope","pin":"042817"}' 'Review link is no longer valid.'
call "withdrawn paper"               404 /review/access '{"reviewToken":"rvWdrn000001","pin":"111111"}' 'Review link is no longer valid.'
call "fresh link -> InProgress"      200 /review/access '{"reviewToken":"rvFresh00001","pin":"135790"}' '"status":"InProgress"'
call "completed has report"          200 /review/access '{"reviewToken":"rvDone000001","pin":"246810"}' '"report"'

echo "--- answer ---"
call "save answer"                   200 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\",\"questionId\":\"q_test05\",\"rating\":3,\"text\":\"Smoke test\"}" 'savedAt'
call "overwrite same question"       200 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\",\"questionId\":\"q_test05\",\"rating\":4,\"text\":\"Smoke test v2\"}" 'savedAt'
call "rating 6"                      400 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\",\"questionId\":\"q_test05\",\"rating\":6,\"text\":\"x\"}" 'rating must be an integer from 1 to 5.'
call "rating 3.5"                    400 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\",\"questionId\":\"q_test05\",\"rating\":3.5,\"text\":\"x\"}" 'rating must be an integer from 1 to 5.'
call "question not in rubric"        404 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"$PIN\",\"questionId\":\"q_nope\",\"rating\":3,\"text\":\"x\"}" 'Question is not in this rubric.'
call "wrong PIN"                     401 /review/answer "{\"reviewToken\":\"$TOK\",\"pin\":\"000000\",\"questionId\":\"q_test05\",\"rating\":3,\"text\":\"x\"}" 'INVALID_PIN'
call "completed review is locked"    409 /review/answer '{"reviewToken":"rvDone000001","pin":"246810","questionId":"q_test01","rating":1,"text":"x"}' 'REVIEW_COMPLETED'

echo; echo "passed: $pass  failed: $fail"; [[ $fail -eq 0 ]]
