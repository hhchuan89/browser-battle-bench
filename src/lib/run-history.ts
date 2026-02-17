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

const canUseLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const safeParseEntries = (raw: string | null): RunHistoryEntry[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is RunHistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        (entry.mode === 'gauntlet' || entry.mode === 'stress') &&
        typeof entry.completedAt === 'string'
    )
  } catch {
    return []
  }
}

const sortByCompletedDesc = (entries: RunHistoryEntry[]): RunHistoryEntry[] =>
  entries.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )

export const loadRunHistory = (): RunHistoryEntry[] => {
  if (!canUseLocalStorage()) return []
  return sortByCompletedDesc(
    safeParseEntries(window.localStorage.getItem(STORAGE_KEY))
  )
}

export const saveRunHistoryEntry = (entry: RunHistoryEntry): void => {
  if (!canUseLocalStorage()) return
  const current = loadRunHistory()
  current.push(entry)
  const bounded = sortByCompletedDesc(current).slice(0, MAX_ENTRIES)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded))
}

export const clearRunHistory = (): void => {
  if (!canUseLocalStorage()) return
  window.localStorage.removeItem(STORAGE_KEY)
}
