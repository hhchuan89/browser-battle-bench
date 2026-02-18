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
