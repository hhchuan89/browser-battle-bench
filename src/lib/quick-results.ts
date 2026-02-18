import {
  loadJsonFromLocalStorage,
  removeLocalStorageKey,
  saveJsonToLocalStorage,
} from '@/lib/persistence'
import { STORAGE_KEYS } from '@/lib/storage-keys'

const MAX_ENTRIES = 50

export interface QuickResultEntry {
  id: string
  scenarioId: string
  scenarioName: string
  completedAt: string
  durationMs: number
  passRate: number
  totalRounds: number
  passedRounds: number
  scorePct: number
}

const isQuickResultEntry = (entry: unknown): entry is QuickResultEntry =>
  typeof entry === 'object' &&
  entry !== null &&
  typeof (entry as QuickResultEntry).id === 'string' &&
  typeof (entry as QuickResultEntry).scenarioId === 'string' &&
  typeof (entry as QuickResultEntry).scenarioName === 'string' &&
  typeof (entry as QuickResultEntry).completedAt === 'string'

const normalizeEntries = (value: unknown): QuickResultEntry[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isQuickResultEntry)
}

const sortByCompletedDesc = (entries: QuickResultEntry[]): QuickResultEntry[] =>
  entries.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )

export const loadQuickResults = (): QuickResultEntry[] =>
  sortByCompletedDesc(
    normalizeEntries(loadJsonFromLocalStorage<unknown>(STORAGE_KEYS.quickResults, []))
  )

export const saveQuickResultEntry = (entry: QuickResultEntry): void => {
  const current = loadQuickResults()
  current.push(entry)
  const bounded = sortByCompletedDesc(current).slice(0, MAX_ENTRIES)
  saveJsonToLocalStorage(STORAGE_KEYS.quickResults, bounded)
}

export const clearQuickResults = (): void => {
  removeLocalStorageKey(STORAGE_KEYS.quickResults)
}

export const getLatestQuickResult = (): QuickResultEntry | null => {
  const entries = loadQuickResults()
  return entries[0] ?? null
}
