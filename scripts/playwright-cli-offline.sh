#!/usr/bin/env bash
set -euo pipefail

# Offline-friendly Playwright launcher.
# Prefer local @playwright/test binary, then cached @playwright/cli.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Keep daemon state/socket inside project-writable paths.
export PLAYWRIGHT_DAEMON_SESSION_DIR="${PLAYWRIGHT_DAEMON_SESSION_DIR:-${PROJECT_ROOT}/.playwright-daemon}"
export PLAYWRIGHT_DAEMON_SOCKETS_DIR="${PLAYWRIGHT_DAEMON_SOCKETS_DIR:-${PROJECT_ROOT}/.playwright-sockets}"
mkdir -p "${PLAYWRIGHT_DAEMON_SESSION_DIR}" "${PLAYWRIGHT_DAEMON_SOCKETS_DIR}"

PWCLI_JS="$(ls -t "$HOME"/.npm/_npx/*/node_modules/@playwright/cli/playwright-cli.js 2>/dev/null | head -n 1 || true)"

PW_BIN="${PROJECT_ROOT}/node_modules/.bin/playwright"
if [[ -x "${PW_BIN}" ]]; then
  exec "${PW_BIN}" "$@"
fi

if [[ "${1:-}" == "test" ]]; then
  cat >&2 <<'ERR'
Playwright test runner not found.
Resolution:
1) Install locally: npm i -D @playwright/test
2) Re-run npm run test:ui
ERR
  exit 127
fi

if [[ -n "${PWCLI_JS}" && -f "${PWCLI_JS}" ]]; then
  exec node "${PWCLI_JS}" "$@"
fi

# Fallback to project/playwright CLI if present in node_modules
if [[ -f "./node_modules/@playwright/cli/playwright-cli.js" ]]; then
  exec node ./node_modules/@playwright/cli/playwright-cli.js "$@"
fi

cat >&2 <<'ERR'
playwright is not available offline.
Resolution:
1) Install locally: npm i -D @playwright/test, or
2) Run once with network to populate npm cache for @playwright/cli
ERR
exit 127
