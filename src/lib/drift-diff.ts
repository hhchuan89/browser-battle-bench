import type { RunHistoryEntry } from '@/lib/run-history'

export interface DriftRunSnapshot {
  completedAt: string
  passRate: number
  scorePct?: number
  totalRounds: number
  passedRounds: number
}

export interface DriftDiff {
  scenarioName: string
  mode: string
  latest: DriftRunSnapshot
  previous: DriftRunSnapshot
  deltaPassRate: number
  deltaScorePct: number | null
}

const toSnapshot = (entry: RunHistoryEntry): DriftRunSnapshot => ({
  completedAt: entry.completedAt,
  passRate: entry.passRate,
  scorePct: entry.scorePct,
  totalRounds: entry.totalRounds,
  passedRounds: entry.passedRounds,
})

export const buildDriftDiff = (
  entries: RunHistoryEntry[],
  groupKey: string
): DriftDiff | null => {
  const [mode, scenarioId] = groupKey.split(':')
  if (!mode || !scenarioId) return null

  const group = entries
    .filter((entry) => entry.mode === mode && entry.scenarioId === scenarioId)
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )

  if (group.length < 2) return null

  const latest = group[0]
  const previous = group[1]
  const deltaScorePct =
    typeof latest.scorePct === 'number' && typeof previous.scorePct === 'number'
      ? Math.round((latest.scorePct - previous.scorePct) * 100) / 100
      : null

  return {
    scenarioName: latest.scenarioName,
    mode,
    latest: toSnapshot(latest),
    previous: toSnapshot(previous),
    deltaPassRate: Math.round((latest.passRate - previous.passRate) * 100) / 100,
    deltaScorePct,
  }
}
