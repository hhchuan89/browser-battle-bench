import { describe, expect, it } from 'vitest'
import {
  clearQuickResults,
  getLatestQuickResult,
  loadQuickResults,
  saveQuickResultEntry,
} from '@/lib/quick-results'

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

describe('quick-results', () => {
  it('returns null when no quick result exists', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    expect(getLatestQuickResult()).toBeNull()
    expect(loadQuickResults()).toEqual([])
  })

  it('saves and sorts quick results by latest completed timestamp', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    saveQuickResultEntry({
      id: 'q-1',
      scenarioId: 'quick-battle-30s',
      scenarioName: 'Quick Battle 30s',
      completedAt: '2026-02-18T10:00:00.000Z',
      durationMs: 28000,
      passRate: 66.67,
      totalRounds: 3,
      passedRounds: 2,
      scorePct: 66.67,
    })

    saveQuickResultEntry({
      id: 'q-2',
      scenarioId: 'quick-battle-30s',
      scenarioName: 'Quick Battle 30s',
      completedAt: '2026-02-18T11:00:00.000Z',
      durationMs: 26000,
      passRate: 100,
      totalRounds: 3,
      passedRounds: 3,
      scorePct: 100,
    })

    const entries = loadQuickResults()
    expect(entries).toHaveLength(2)
    expect(entries[0].id).toBe('q-2')
    expect(getLatestQuickResult()?.id).toBe('q-2')
  })

  it('clears all quick results', () => {
    const storage = createMemoryStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: storage },
      configurable: true,
    })

    saveQuickResultEntry({
      id: 'q-3',
      scenarioId: 'quick-battle-30s',
      scenarioName: 'Quick Battle 30s',
      completedAt: '2026-02-18T12:00:00.000Z',
      durationMs: 25000,
      passRate: 33.33,
      totalRounds: 3,
      passedRounds: 1,
      scorePct: 33.33,
    })

    clearQuickResults()
    expect(loadQuickResults()).toEqual([])
  })
})
