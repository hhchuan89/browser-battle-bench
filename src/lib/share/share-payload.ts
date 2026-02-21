import type { RoundResult } from '@/types/battle'
import type { EnduranceReport } from '@/types/endurance'
import type { RunHistoryEntry } from '@/lib/run-history'
import type { ShareResultPayload, ShareScores } from '@/types/share'
import type { Stage } from '@/lib/progression'
import { getNextRoute } from '@/lib/progression'
import { buildChallengeUrl, type ChallengeMode } from '@/lib/share/share-link'
import {
  arenaScores,
  averageShareScore,
  battleScores,
  historyScores,
  stressScores,
} from '@/lib/share/share-metrics'
import {
  badgeFromGrade,
  gradeFromScore,
  tauntFromGrade,
} from '@/lib/share/share-grade'

const DEFAULT_ORIGIN = 'https://browserbattlebench.vercel.app'
const UNKNOWN_HARDWARE = 'GPU: Unknown'

const resolveOrigin = (origin?: string): string => {
  if (origin && origin.trim()) return origin.trim()
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return DEFAULT_ORIGIN
}

const resolveHardwareLabel = (hardwareLabel?: string): string =>
  hardwareLabel && hardwareLabel.trim() ? hardwareLabel : UNKNOWN_HARDWARE

const makePayload = (input: {
  mode: ShareResultPayload['mode']
  stageForLink: ChallengeMode
  stageForNext?: Stage
  scenarioId: string
  scenarioName: string
  modelId: string
  runRef?: string | null
  scores: ShareScores
  hardwareLabel?: string
  nextRoute?: string
  origin?: string
}): ShareResultPayload => {
  const shareScore = averageShareScore(input.scores)
  const grade = gradeFromScore(shareScore)
  const origin = resolveOrigin(input.origin)
  const runRef = input.runRef ?? null
  const challengeUrl = buildChallengeUrl({
    origin,
    mode: input.stageForLink,
    scenarioId: input.scenarioId,
    modelId: input.modelId,
    runRef,
  })

  return {
    mode: input.mode,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    modelId: input.modelId,
    grade,
    badgeText: badgeFromGrade(grade),
    scores: input.scores,
    hardwareLabel: resolveHardwareLabel(input.hardwareLabel),
    taunt: tauntFromGrade(grade),
    runRef,
    shareUrl: challengeUrl,
    challengeUrl,
    nextRoute:
      input.nextRoute ??
      (input.stageForNext ? getNextRoute(input.stageForNext) : undefined),
  }
}

export const buildArenaSharePayload = (input: {
  scenarioId: string
  scenarioName: string
  modelId: string
  runRef?: string | null
  hardwareLabel?: string
  origin?: string
  breakdown: {
    formatCompliance: number
    fieldCompleteness: number
    responseEfficiency: number
  }
}): ShareResultPayload =>
  makePayload({
    mode: 'arena',
    stageForLink: 'arena',
    stageForNext: 'arena',
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    modelId: input.modelId,
    runRef: input.runRef,
    scores: arenaScores(input.breakdown),
    hardwareLabel: input.hardwareLabel,
    origin: input.origin,
  })

export const buildBattleSharePayload = (input: {
  mode: 'quick' | 'gauntlet'
  scenarioId: string
  scenarioName: string
  modelId: string
  runRef?: string | null
  results: RoundResult[]
  hardwareLabel?: string
  origin?: string
  stressBlocked?: boolean
}): ShareResultPayload =>
  makePayload({
    mode: input.mode,
    stageForLink: input.mode,
    stageForNext: input.mode,
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    modelId: input.modelId,
    runRef: input.runRef,
    scores: battleScores(input.results),
    hardwareLabel: input.hardwareLabel,
    origin: input.origin,
    nextRoute:
      input.mode === 'gauntlet'
        ? getNextRoute('gauntlet', { stressBlocked: input.stressBlocked })
        : getNextRoute(input.mode),
  })

export const buildStressSharePayload = (input: {
  scenarioId: string
  scenarioName: string
  modelId: string
  runRef?: string | null
  report: EnduranceReport
  hardwareLabel?: string
  origin?: string
}): ShareResultPayload =>
  makePayload({
    mode: 'stress',
    stageForLink: 'stress',
    stageForNext: 'stress',
    scenarioId: input.scenarioId,
    scenarioName: input.scenarioName,
    modelId: input.modelId,
    runRef: input.runRef,
    scores: stressScores(input.report),
    hardwareLabel: input.hardwareLabel,
    origin: input.origin,
  })

const toChallengeMode = (mode: RunHistoryEntry['mode']): ChallengeMode =>
  mode === 'stress' ? 'stress' : mode === 'quick' ? 'quick' : 'gauntlet'

const fallbackHistoryModel = (mode: RunHistoryEntry['mode']): string =>
  mode === 'stress' ? 'Stress Runner' : 'Unknown Model'

export const buildHistorySharePayload = (input: {
  entry: RunHistoryEntry
  modelId?: string
  hardwareLabel?: string
  origin?: string
}): ShareResultPayload =>
  makePayload({
    mode: 'history',
    stageForLink: toChallengeMode(input.entry.mode),
    scenarioId: input.entry.scenarioId,
    scenarioName: input.entry.scenarioName,
    modelId: input.modelId || fallbackHistoryModel(input.entry.mode),
    runRef: input.entry.id,
    scores: historyScores(input.entry),
    hardwareLabel: input.hardwareLabel,
    origin: input.origin,
  })

