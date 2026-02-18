#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

apply_task_persistence_core() {
  cat > src/lib/persistence.ts <<'TS'
const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const loadJsonFromLocalStorage = <T>(key: string, fallback: T): T => {
  if (!canUseLocalStorage()) return fallback

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const saveJsonToLocalStorage = <T>(key: string, value: T): boolean => {
  if (!canUseLocalStorage()) return false

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const removeLocalStorageKey = (key: string): void => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(key)
}
TS

  cat > src/lib/run-history.ts <<'TS'
import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'

const STORAGE_KEY = 'bbb:run-history:v1'
const MAX_ENTRIES = 200

export type RunMode = 'gauntlet' | 'stress'

export interface RunHistoryEntry {
  id: string
  mode: RunMode
  scenarioId: string
  scenarioName: string
  startedAt?: string
  completedAt: string
  durationMs: number
  passRate: number
  totalRounds: number
  passedRounds: number
  scorePct?: number
  verdict?: string
  notes?: string
}

const isRunHistoryEntry = (entry: unknown): entry is RunHistoryEntry =>
  typeof entry === 'object' &&
  entry !== null &&
  typeof (entry as RunHistoryEntry).id === 'string' &&
  ((entry as RunHistoryEntry).mode === 'gauntlet' ||
    (entry as RunHistoryEntry).mode === 'stress') &&
  typeof (entry as RunHistoryEntry).completedAt === 'string'

const normalizeEntries = (value: unknown): RunHistoryEntry[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isRunHistoryEntry)
}

const sortByCompletedDesc = (entries: RunHistoryEntry[]): RunHistoryEntry[] =>
  entries.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )

export const loadRunHistory = (): RunHistoryEntry[] =>
  sortByCompletedDesc(
    normalizeEntries(loadJsonFromLocalStorage<unknown>(STORAGE_KEY, []))
  )

export const saveRunHistoryEntry = (entry: RunHistoryEntry): void => {
  const current = loadRunHistory()
  current.push(entry)
  const bounded = sortByCompletedDesc(current).slice(0, MAX_ENTRIES)
  saveJsonToLocalStorage(STORAGE_KEY, bounded)
}

export const clearRunHistory = (): void => {
  removeLocalStorageKey(STORAGE_KEY)
}
TS

  if ! rg -q "from './persistence'" src/lib/index.ts; then
    cat >> src/lib/index.ts <<'TS'
export {
  loadJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeLocalStorageKey,
} from './persistence'
TS
  fi

  echo 'TASK_APPLIED: persistence-core'
}

apply_task_persistence_tests() {
  cat > tests/unit/persistence.spec.ts <<'TS'
import { describe, expect, it } from 'vitest'
import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('persistence helpers', () => {
  it('loads fallback when key does not exist', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(loadJsonFromLocalStorage('missing:key', { ok: true })).toEqual({
      ok: true,
    })
  })

  it('saves and loads JSON payloads', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    const saved = saveJsonToLocalStorage('bbb:test', { count: 2 })
    expect(saved).toBe(true)
    expect(loadJsonFromLocalStorage('bbb:test', { count: 0 })).toEqual({
      count: 2,
    })
  })

  it('removes stored keys', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    saveJsonToLocalStorage('bbb:test', { x: 1 })
    removeLocalStorageKey('bbb:test')

    expect(loadJsonFromLocalStorage('bbb:test', null)).toBeNull()
  })

  it('falls back when localStorage contains invalid JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem('bbb:invalid', '{not-valid-json')

    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(loadJsonFromLocalStorage('bbb:invalid', { safe: true })).toEqual({
      safe: true,
    })
  })
})
TS

  echo 'TASK_APPLIED: persistence-tests'
}

apply_task_report_contract_ua_tests() {
  perl -0pi -e "s/const detectBrowser/export const detectBrowser/" src/lib/report-contract.ts
  perl -0pi -e "s/const detectOs/export const detectOs/" src/lib/report-contract.ts

  cat > tests/unit/reportContractUa.spec.ts <<'TS'
import { describe, expect, it } from 'vitest'
import { detectBrowser, detectOs } from '@/lib/report-contract'

describe('report-contract UA detection', () => {
  it('detects browser family', () => {
    expect(detectBrowser('Mozilla/5.0 Chrome/145.0.0.0 Safari/537.36')).toBe(
      'Chrome'
    )
    expect(detectBrowser('Mozilla/5.0 Edg/124.0.0.0')).toBe('Edge')
    expect(detectBrowser('Mozilla/5.0 Version/17.0 Safari/605.1.15')).toBe(
      'Safari'
    )
    expect(detectBrowser('Mozilla/5.0 Firefox/123.0')).toBe('Firefox')
  })

  it('detects operating system family', () => {
    expect(detectOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe(
      'macOS'
    )
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'Windows'
    )
    expect(detectOs('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux')
    expect(detectOs('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('Android')
    expect(detectOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'iOS'
    )
  })
})
TS

  echo 'TASK_APPLIED: report-contract-ua-tests'
}

if [[ ! -f src/lib/persistence.ts ]]; then
  apply_task_persistence_core
  exit 0
fi

if [[ ! -f tests/unit/persistence.spec.ts ]]; then
  apply_task_persistence_tests
  exit 0
fi

if [[ ! -f tests/unit/reportContractUa.spec.ts ]]; then
  apply_task_report_contract_ua_tests
  exit 0
fi

echo 'NO_PENDING_TASK'
exit 0
