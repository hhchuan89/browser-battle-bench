import type { RoundResult } from '@/types/battle'
import type { EnduranceReport } from '@/types/endurance'
import type { RunHistoryEntry } from '@/lib/run-history'
import type { ShareScores } from '@/types/share'
import { normalizeScore } from '@/lib/share/share-grade'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const round2 = (value: number): number => Math.round(value * 100) / 100

const isJsonComplianceFailure = (reason?: string): boolean => {
  if (!reason) return false
  return /No valid JSON|JSON parsing failed|JSON missing required/i.test(reason)
}

const passVariance = (results: RoundResult[]): number => {
  if (results.length === 0) return 0
  const flags: number[] = results.map((result) => (result.passed ? 1 : 0))
  const mean = flags.reduce((sum, value) => sum + value, 0) / flags.length
  const variance =
    flags.reduce((sum, value) => sum + (value - mean) ** 2, 0) / flags.length
  return variance
}

export const averageShareScore = (scores: ShareScores): number =>
  round2((scores.obedience + scores.intelligence + scores.stability) / 3)

export const arenaScores = (input: {
  formatCompliance: number
  fieldCompleteness: number
  responseEfficiency: number
}): ShareScores => ({
  obedience: normalizeScore(input.formatCompliance),
  intelligence: normalizeScore(input.fieldCompleteness),
  stability: normalizeScore(input.responseEfficiency),
})

export const battleScores = (results: RoundResult[]): ShareScores => {
  if (results.length === 0) {
    return { obedience: 0, intelligence: 0, stability: 0 }
  }

  const total = results.length
  const passed = results.filter((result) => result.passed).length
  const passRate = (passed / total) * 100

  const jsonCompliantCount = results.filter(
    (result) => !isJsonComplianceFailure(result.failureReason)
  ).length
  const obedience = (jsonCompliantCount / total) * 100

  const variance = passVariance(results)
  const stability = clamp((1 - variance / 0.25) * 100, 0, 100)

  return {
    obedience: round2(obedience),
    intelligence: round2(passRate),
    stability: round2(stability),
  }
}

export const stressScores = (report: EnduranceReport): ShareScores => {
  const intelligence = normalizeScore(report.passRate)
  const obedience = normalizeScore(report.passRate)

  let stability = clamp(100 - report.leakRateMBPerRound * 25, 0, 100)
  if (report.verdict === 'UNSTABLE') stability = Math.min(stability, 40)
  if (report.verdict === 'CONCURRENCY_ISSUES') stability = Math.min(stability, 55)
  if (report.verdict === 'MEMORY_LEAK') stability = Math.min(stability, 50)

  return {
    obedience: round2(obedience),
    intelligence: round2(intelligence),
    stability: round2(stability),
  }
}

export const historyScores = (entry: RunHistoryEntry): ShareScores => {
  const intelligence = normalizeScore(entry.passRate)
  const obedience = normalizeScore(
    typeof entry.scorePct === 'number' ? entry.scorePct : entry.passRate
  )

  let stability = 70
  if (entry.verdict === 'STABLE') stability = 90
  else if (entry.verdict === 'MEMORY_LEAK') stability = 45
  else if (entry.verdict === 'CONCURRENCY_ISSUES') stability = 55
  else if (entry.verdict === 'UNSTABLE') stability = 35

  return {
    obedience: round2(obedience),
    intelligence: round2(intelligence),
    stability: round2(stability),
  }
}

