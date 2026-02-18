import type { RunHistoryEntry, RunMode } from '@/lib/run-history'

export type DriftRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DriftGroupSummary {
  key: string
  mode: RunMode
  scenarioId: string
  scenarioName: string
  runs: number
  avgPassRate: number
  variance: number
  stdDev: number
  consistencyScore: number
  riskLevel: DriftRiskLevel
  latestCompletedAt: string
}

export interface DriftAnalysisSummary {
  groups: DriftGroupSummary[]
  overallConsistency: number
  unstableGroups: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const variance = (values: number[]): number => {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const squared = values.map((value) => (value - mean) ** 2)
  return squared.reduce((sum, value) => sum + value, 0) / values.length
}

const resolveRiskLevel = (consistencyScore: number): DriftRiskLevel => {
  if (consistencyScore < 60) return 'HIGH'
  if (consistencyScore < 80) return 'MEDIUM'
  return 'LOW'
}

const toScoreSignal = (entry: RunHistoryEntry): number =>
  typeof entry.scorePct === 'number' ? entry.scorePct : entry.passRate

export const analyzeRunDrift = (
  entries: RunHistoryEntry[],
  minRuns = 2
): DriftAnalysisSummary => {
  const grouped = new Map<string, RunHistoryEntry[]>()

  for (const entry of entries) {
    const key = `${entry.mode}:${entry.scenarioId}`
    const group = grouped.get(key) ?? []
    group.push(entry)
    grouped.set(key, group)
  }

  const groups: DriftGroupSummary[] = []

  for (const [key, group] of grouped.entries()) {
    if (group.length < minRuns) continue

    const scores = group.map(toScoreSignal)
    const varValue = variance(scores)
    const stdDev = Math.sqrt(varValue)
    const avgPassRate =
      group.reduce((sum, entry) => sum + entry.passRate, 0) / group.length
    const consistencyScore = clamp(100 - stdDev * 2.5, 0, 100)
    const latestCompletedAt = [...group]
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0].completedAt

    groups.push({
      key,
      mode: group[0].mode,
      scenarioId: group[0].scenarioId,
      scenarioName: group[0].scenarioName,
      runs: group.length,
      avgPassRate: Math.round(avgPassRate * 100) / 100,
      variance: Math.round(varValue * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      riskLevel: resolveRiskLevel(consistencyScore),
      latestCompletedAt,
    })
  }

  const sorted = groups.sort((a, b) => {
    const rank = (risk: DriftRiskLevel) =>
      risk === 'HIGH' ? 0 : risk === 'MEDIUM' ? 1 : 2
    const rankDiff = rank(a.riskLevel) - rank(b.riskLevel)
    if (rankDiff !== 0) return rankDiff
    if (a.consistencyScore !== b.consistencyScore) {
      return a.consistencyScore - b.consistencyScore
    }
    return b.runs - a.runs
  })

  const unstableGroups = sorted.filter((group) => group.riskLevel !== 'LOW').length
  const overallConsistency =
    sorted.length === 0
      ? 100
      : Math.round(
          (sorted.reduce((sum, group) => sum + group.consistencyScore, 0) /
            sorted.length) *
            100
        ) / 100

  return {
    groups: sorted,
    overallConsistency,
    unstableGroups,
  }
}
