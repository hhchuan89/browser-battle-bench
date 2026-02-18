#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://browserbattlebench.vercel.app}"
BASE_URL="${BASE_URL%/}"

routes=(
  "/"
  "/arena"
  "/gauntlet"
  "/stress"
  "/leaderboard"
  "/history"
  "/diagnostics"
)

failures=0

for route in "${routes[@]}"; do
  url="${BASE_URL}${route}"
  code="$(curl -L -sS -o /dev/null -w '%{http_code}' "$url" || echo 000)"

  if [[ "$code" =~ ^[23] ]]; then
    printf 'PASS %s -> HTTP %s\n' "$route" "$code"
  else
    printf 'FAIL %s -> HTTP %s\n' "$route" "$code"
    failures=$((failures + 1))
  fi
done

# Lightweight sentinel check to ensure we are not hitting an unrelated HTML shell.
root_html="$(curl -L -sS "${BASE_URL}/" || true)"
if ! printf '%s' "$root_html" | rg -qi 'Browser Battle Bench'; then
  echo 'FAIL / sentinel text missing: Browser Battle Bench'
  failures=$((failures + 1))
else
  echo 'PASS / sentinel text found'
fi

if (( failures > 0 )); then
  echo "NO_POPUP_UI_SMOKE_FAILED failures=${failures}"
  exit 1
fi

echo 'NO_POPUP_UI_SMOKE_OK'
