#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

PLAN_DIR="${PROJECT_ROOT}/plan-job"
MASTER_PLAN="${PLAN_DIR}/bbb-master-plan.md"
MASTER_IMPL="${PLAN_DIR}/master-implementation-plan.md"
WORKFLOW_STATE="${PLAN_DIR}/WORKFLOW_STATE.md"

NO_POPUP_MODE="${BBB_NO_POPUP_MODE:-1}"
BASE_URL="${BBB_BASE_URL:-https://browserbattlebench.vercel.app}"
PLAYWRIGHT_CHANNEL="${BBB_PLAYWRIGHT_CHANNEL:-chromium}"
IMPLEMENT_HOOK="${BBB_IMPLEMENT_HOOK:-${PROJECT_ROOT}/scripts/full-cycle-implement.sh}"
CYCLE_KIND="${BBB_CYCLE_KIND:-automation}"

TS="$(date +%Y%m%d-%H%M)"
NOW_HUMAN="$(date '+%Y-%m-%d %H:%M:%S %z')"

IMPL_PLAN_FILE="${PLAN_DIR}/${TS}-implementation-plan.md"
TEST_REPORT_FILE="${PLAN_DIR}/${TS}-test-report.md"
LOG_DIR="/tmp/bbb-cycle-${TS}"
mkdir -p "$LOG_DIR"

PRODUCT_STATUS="PASS"
ENV_STATUS="OK"
PUSH_STATUS="OK"
IMPLEMENT_STATUS="NO_HOOK"
UI_MODE="PLAYWRIGHT"
PUSH_ERROR=""
LATEST_TEST_REPORT="none"
LATEST_IMPL_PLAN="none"
SUMMARY_NOTES=()

if [[ "$NO_POPUP_MODE" == "1" ]]; then
  UI_MODE="NO_POPUP_HTTP_SMOKE"
fi

log() {
  printf '[full-cycle] %s\n' "$*"
}

append_note() {
  SUMMARY_NOTES+=("$*")
}

run_capture() {
  local name="$1"
  shift
  local logfile="${LOG_DIR}/${name}.log"

  if "$@" >"$logfile" 2>&1; then
    echo "$logfile"
    return 0
  fi

  echo "$logfile"
  return 1
}

latest_timestamped() {
  local suffix="$1"
  ls -1 "${PLAN_DIR}"/[0-9]*-"${suffix}".md 2>/dev/null | sort | tail -n 1 || true
}

ensure_prereqs() {
  local missing=()
  local bin

  for bin in vitest vue-tsc playwright; do
    if [[ ! -x "${PROJECT_ROOT}/node_modules/.bin/${bin}" ]]; then
      missing+=("$bin")
    fi
  done

  if (( ${#missing[@]} == 0 )); then
    return 0
  fi

  append_note "toolchain missing: ${missing[*]}"

  local backoffs=(20 40 80)
  local attempt
  for attempt in "${!backoffs[@]}"; do
    local i=$((attempt + 1))
    local logfile="${LOG_DIR}/npm_ci_attempt_${i}.log"

    if npm ci --prefer-offline --no-audit --no-fund >"$logfile" 2>&1; then
      local still_missing=()
      for bin in vitest vue-tsc playwright; do
        if [[ ! -x "${PROJECT_ROOT}/node_modules/.bin/${bin}" ]]; then
          still_missing+=("$bin")
        fi
      done
      if (( ${#still_missing[@]} == 0 )); then
        append_note "npm ci self-heal success on attempt ${i}"
        return 0
      fi
      append_note "npm ci attempt ${i} done but still missing: ${still_missing[*]}"
    else
      append_note "npm ci attempt ${i} failed (see ${logfile})"
    fi

    if (( i < ${#backoffs[@]} + 1 )); then
      sleep "${backoffs[$attempt]}"
    fi
  done

  ENV_STATUS="ENV_BLOCKED"
  append_note "toolchain bootstrap failed after retries"
  return 1
}

push_guard() {
  local reason="$1"
  local logfile="${LOG_DIR}/git_push_${reason}.log"
  local backoffs=(20 40 80 160 300 300 300 300)
  : >"$logfile"

  local attempt
  for attempt in "${!backoffs[@]}"; do
    local i=$((attempt + 1))
    {
      echo "=== push attempt ${i} (${reason}) ==="
      date '+%Y-%m-%d %H:%M:%S %z'
      git push origin main
    } >>"$logfile" 2>&1 && {
      PUSH_STATUS="OK"
      return 0
    }

    if rg -qi 'Personal Access Token.*workflow|workflow.*scope|refusing to allow a Personal Access Token to create or update workflow' "$logfile"; then
      PUSH_STATUS="AUTH_BLOCKED_WORKFLOW_SCOPE"
      PUSH_ERROR='PAT missing workflow scope for .github/workflows push.'
      return 1
    fi

    if (( i < ${#backoffs[@]} + 1 )); then
      sleep "${backoffs[$attempt]}"
    fi
  done

  if rg -qi 'Could not resolve host|Temporary failure|Name or service not known|Failed to connect|Couldn.t resolve host' "$logfile"; then
    PUSH_STATUS="PUSH_BLOCKED_DNS"
    PUSH_ERROR='DNS/network failure while pushing to github.com.'
  else
    PUSH_STATUS="PUSH_BLOCKED"
    PUSH_ERROR="git push failed; see ${logfile}"
  fi

  return 1
}

ensure_workflow_state() {
  if [[ -f "$WORKFLOW_STATE" ]]; then
    return 0
  fi

  cat >"$WORKFLOW_STATE" <<'STATE'
# Workflow State

Current Mode: Full Cycle Script (no-popup compatible)
STATE
}

for f in "$MASTER_PLAN" "$MASTER_IMPL"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing required file: $f" >&2
    exit 1
  fi
done

LATEST_TEST_REPORT="$(latest_timestamped 'test-report')"
LATEST_IMPL_PLAN="$(latest_timestamped 'implementation-plan')"
[[ -n "$LATEST_TEST_REPORT" ]] || LATEST_TEST_REPORT='none'
[[ -n "$LATEST_IMPL_PLAN" ]] || LATEST_IMPL_PLAN='none'

cat >"$IMPL_PLAN_FILE" <<EOF_PLAN
# BBB Implementation Plan
**Generated:** ${NOW_HUMAN}
**Cycle Mode:** script-based full cycle
**No-Popup Mode:** ${NO_POPUP_MODE}

## Canonical Inputs
- ${MASTER_PLAN}
- ${MASTER_IMPL}
- Latest test report: ${LATEST_TEST_REPORT}
- Latest implementation plan: ${LATEST_IMPL_PLAN}

## Execution Plan
1. Preflight git sync and push guard.
2. Ensure local toolchain (npm ci self-heal when needed).
3. Optional implementation hook: ${IMPLEMENT_HOOK} (if executable).
4. Mandatory validation: npm run test:unit + npm run build.
5. UI check:
- If no-popup mode: scripts/no-popup-ui-smoke.sh against ${BASE_URL}.
- Else: Playwright smoke with BBB_PLAYWRIGHT_CHANNEL=${PLAYWRIGHT_CHANNEL}.
6. Commit non-plan-job changes and push with guarded retries.
7. Produce test report + workflow state entry.
EOF_PLAN

append_note "implementation plan created: $(basename "$IMPL_PLAN_FILE")"

git_status_log="$(run_capture git_status git status -sb)"
append_note "git status logged: ${git_status_log}"

if ! run_capture git_fetch git fetch origin main --prune >/dev/null; then
  ENV_STATUS="ENV_BLOCKED"
  append_note "git fetch failed (continuing with local graph)"
fi

ahead=0
behind=0
if run_capture git_ahead_behind git rev-list --left-right --count origin/main...HEAD >/dev/null; then
  read -r behind ahead <"${LOG_DIR}/git_ahead_behind.log"
  append_note "ahead=${ahead}, behind=${behind}"
else
  append_note 'unable to compute ahead/behind'
fi

if (( ahead > 0 )); then
  append_note 'preflight push required before implementation'
  if ! push_guard preflight; then
    append_note "preflight push blocked: ${PUSH_STATUS}"
  fi
fi

if [[ "$PUSH_STATUS" == "OK" ]]; then
  ensure_prereqs || true

  if [[ -x "$IMPLEMENT_HOOK" ]]; then
    if run_capture implementation_hook "$IMPLEMENT_HOOK" >/dev/null; then
      IMPLEMENT_STATUS='HOOK_EXECUTED'
    else
      IMPLEMENT_STATUS='HOOK_FAILED'
      PRODUCT_STATUS='FAIL'
      append_note "implementation hook failed: ${LOG_DIR}/implementation_hook.log"
    fi
  else
    IMPLEMENT_STATUS='NO_HOOK'
    append_note 'implementation hook missing or not executable (no-op)'
  fi
else
  IMPLEMENT_STATUS='SKIPPED_PUSH_BLOCKED'
  PRODUCT_STATUS='PARTIAL'
  append_note 'validation skipped because preflight push is blocked'
fi

if [[ "$PUSH_STATUS" == "OK" ]]; then
  if ! run_capture test_unit npm run test:unit >/dev/null; then
    PRODUCT_STATUS='FAIL'
    append_note "unit test failed: ${LOG_DIR}/test_unit.log"
  fi

  if ! run_capture build npm run build >/dev/null; then
    PRODUCT_STATUS='FAIL'
    append_note "build failed: ${LOG_DIR}/build.log"
  fi

  if [[ "$NO_POPUP_MODE" == "1" ]]; then
    UI_MODE='NO_POPUP_HTTP_SMOKE'
    if ! run_capture ui_no_popup "${PROJECT_ROOT}/scripts/no-popup-ui-smoke.sh" "$BASE_URL" >/dev/null; then
      ENV_STATUS='ENV_BLOCKED'
      if [[ "$PRODUCT_STATUS" == 'PASS' ]]; then
        PRODUCT_STATUS='PARTIAL'
      fi
      append_note "no-popup UI smoke failed: ${LOG_DIR}/ui_no_popup.log"
    fi
  else
    UI_MODE='PLAYWRIGHT'
    if ! run_capture ui_local env BBB_PLAYWRIGHT_CHANNEL="$PLAYWRIGHT_CHANNEL" npm run test:ui >/dev/null; then
      if rg -qi 'MachPortRendezvousServer|browserType.launch|Target page, context or browser has been closed' "${LOG_DIR}/ui_local.log"; then
        ENV_STATUS='ENV_BLOCKED'
        if [[ "$PRODUCT_STATUS" == 'PASS' ]]; then
          PRODUCT_STATUS='PARTIAL'
        fi
      else
        PRODUCT_STATUS='FAIL'
      fi
      append_note "local playwright smoke failed: ${LOG_DIR}/ui_local.log"
    fi

    if ! run_capture ui_remote env BBB_PLAYWRIGHT_CHANNEL="$PLAYWRIGHT_CHANNEL" BBB_BASE_URL="$BASE_URL" npm run test:ui >/dev/null; then
      if rg -qi 'MachPortRendezvousServer|browserType.launch|Target page, context or browser has been closed' "${LOG_DIR}/ui_remote.log"; then
        ENV_STATUS='ENV_BLOCKED'
        if [[ "$PRODUCT_STATUS" == 'PASS' ]]; then
          PRODUCT_STATUS='PARTIAL'
        fi
      else
        PRODUCT_STATUS='FAIL'
      fi
      append_note "remote playwright smoke failed: ${LOG_DIR}/ui_remote.log"
    fi
  fi
fi

commit_sha='none'
if [[ "$PUSH_STATUS" == "OK" && "$PRODUCT_STATUS" == "PASS" ]]; then
  git add -A
  git reset --quiet -- plan-job || true
  if ! git diff --cached --quiet; then
    if git commit -m "chore: automated full cycle ${TS}" >"${LOG_DIR}/git_commit.log" 2>&1; then
      commit_sha="$(git rev-parse --short HEAD)"
      append_note "commit created: ${commit_sha}"
      if ! push_guard post_commit; then
        if [[ "$PRODUCT_STATUS" == 'PASS' ]]; then
          PRODUCT_STATUS='PARTIAL'
        fi
        append_note "post-commit push blocked: ${PUSH_STATUS}"
      fi
    else
      PRODUCT_STATUS='FAIL'
      append_note "git commit failed: ${LOG_DIR}/git_commit.log"
    fi
  else
    append_note 'no code changes to commit'
  fi
elif [[ "$PUSH_STATUS" == "OK" ]]; then
  PUSH_STATUS='SKIPPED_PRODUCT_NOT_PASS'
  append_note "commit/push skipped because product status is ${PRODUCT_STATUS}"
fi

cat >"$TEST_REPORT_FILE" <<EOF_REPORT
# 🏟️ BBB Test Report
**Date:** ${NOW_HUMAN}
**Cycle Type:** Scripted Full Cycle

## Status Classification
- **Product Status:** ${PRODUCT_STATUS}
- **Environment Status:** ${ENV_STATUS}
- **Push Status:** ${PUSH_STATUS}
- **Implementation Status:** ${IMPLEMENT_STATUS}
- **UI Mode:** ${UI_MODE}

## Inputs
- ${MASTER_PLAN}
- ${MASTER_IMPL}
- Latest previous report: ${LATEST_TEST_REPORT}
- Latest previous plan: ${LATEST_IMPL_PLAN}
- Current plan: ${IMPL_PLAN_FILE}

## Command Logs
- git status: ${LOG_DIR}/git_status.log
- git fetch: ${LOG_DIR}/git_fetch.log
- ahead/behind: ${LOG_DIR}/git_ahead_behind.log
- unit test: ${LOG_DIR}/test_unit.log
- build: ${LOG_DIR}/build.log
- ui (no-popup): ${LOG_DIR}/ui_no_popup.log
- ui local playwright: ${LOG_DIR}/ui_local.log
- ui remote playwright: ${LOG_DIR}/ui_remote.log
- commit: ${LOG_DIR}/git_commit.log
- push preflight: ${LOG_DIR}/git_push_preflight.log
- push post-commit: ${LOG_DIR}/git_push_post_commit.log

## Notes
EOF_REPORT

for note in "${SUMMARY_NOTES[@]}"; do
  printf -- '- %s\n' "$note" >>"$TEST_REPORT_FILE"
done

if [[ -n "$PUSH_ERROR" ]]; then
  {
    echo
    echo '## Push Error'
    echo "${PUSH_ERROR}"
  } >>"$TEST_REPORT_FILE"
fi

ensure_workflow_state
printf -- '- Cycle %s (%s): product=%s env=%s push=%s impl=%s ui=%s plan=%s report=%s commit=%s\n' \
  "$(date '+%Y-%m-%d %H:%M %z')" \
  "$CYCLE_KIND" \
  "$PRODUCT_STATUS" \
  "$ENV_STATUS" \
  "$PUSH_STATUS" \
  "$IMPLEMENT_STATUS" \
  "$UI_MODE" \
  "$(basename "$IMPL_PLAN_FILE")" \
  "$(basename "$TEST_REPORT_FILE")" \
  "$commit_sha" >>"$WORKFLOW_STATE"

log "plan: ${IMPL_PLAN_FILE}"
log "report: ${TEST_REPORT_FILE}"
log "statuses: product=${PRODUCT_STATUS} env=${ENV_STATUS} push=${PUSH_STATUS} impl=${IMPLEMENT_STATUS} ui=${UI_MODE}"

if [[ "$PUSH_STATUS" == "OK" && "$PRODUCT_STATUS" == "PASS" ]]; then
  exit 0
fi

exit 2
