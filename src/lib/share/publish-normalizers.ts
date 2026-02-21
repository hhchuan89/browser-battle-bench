import { averageShareScore } from '@/lib/share/share-metrics'
import { normalizeScore } from '@/lib/share/share-grade'
import type {
  BuildArenaPublishInput,
  BuildBattlePublishInput,
  BuildStressPublishInput,
  PublishReportRequest,
} from '@/lib/share/publish-types'

const resolveTier = (tier?: string): string => (tier && tier.trim() ? tier.trim() : 'UNKNOWN')

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') return null
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

const toNullableInt = (value: unknown): number | null => {
  if (typeof value !== 'number') return null
  return Number.isFinite(value) ? Math.round(value) : null
}

export const buildArenaPublishRequest = (
  input: BuildArenaPublishInput
): PublishReportRequest => ({
  mode: 'arena',
  scenario_id: input.payload.scenarioId,
  scenario_name: input.payload.scenarioName,
  model_id: input.payload.modelId,
  score: normalizeScore(input.score.totalScore),
  grade: input.payload.grade,
  tier: resolveTier(input.tier),
  source_run_ref: input.payload.runRef || null,
  report_summary: {
    mode: 'arena',
    hardware_label: input.payload.hardwareLabel,
    taunt: input.payload.taunt,
    scores: input.payload.scores,
    breakdown: input.score.breakdown,
    warnings: input.score.warnings,
    errors: input.score.errors,
  },
})

export const buildBattlePublishRequest = (
  input: BuildBattlePublishInput
): PublishReportRequest => {
  const primaryModel = input.report.models_tested?.[0]
  const logicTrapsDetails = primaryModel?.phases?.logic_traps?.details as
    | Record<string, unknown>
    | undefined

  return {
    mode: input.payload.mode === 'gauntlet' ? 'gauntlet' : 'quick',
    scenario_id: input.payload.scenarioId,
    scenario_name: input.payload.scenarioName,
    model_id: input.payload.modelId,
    score: normalizeScore(primaryModel?.total_score ?? averageShareScore(input.payload.scores)),
    grade: input.payload.grade,
    tier: resolveTier(input.tier ?? input.report.hardware?.tier),
    pass_rate: toNullableNumber(logicTrapsDetails?.pass_rate),
    total_rounds: toNullableInt(logicTrapsDetails?.total_rounds),
    passed_rounds: toNullableInt(logicTrapsDetails?.passed_rounds),
    run_hash: input.report.run_hash || null,
    replay_hash: input.report.replay_hash || null,
    source_run_ref: input.payload.runRef || null,
    report_summary: {
      mode: input.payload.mode,
      timestamp: input.report.timestamp,
      app_version: input.report.app_version,
      test_suite_version: input.report.test_suite_version,
      hardware: input.report.hardware,
      model_name: primaryModel?.model_name || input.payload.modelId,
      total_score: primaryModel?.total_score ?? null,
      phases: primaryModel?.phases ?? {},
      share_scores: input.payload.scores,
      share_taunt: input.payload.taunt,
    },
    bbb_report: input.report as unknown as Record<string, unknown>,
  }
}

export const buildStressPublishRequest = (
  input: BuildStressPublishInput
): PublishReportRequest => ({
  mode: 'stress',
  scenario_id: input.payload.scenarioId,
  scenario_name: input.payload.scenarioName,
  model_id: input.payload.modelId,
  score: normalizeScore(input.report.passRate),
  grade: input.payload.grade,
  tier: resolveTier(input.tier),
  pass_rate: normalizeScore(input.report.passRate),
  total_rounds: input.report.totalRounds,
  passed_rounds: input.report.passedRounds,
  source_run_ref: input.payload.runRef || null,
  report_summary: {
    mode: 'stress',
    timestamp: input.report.timestamp,
    verdict: input.report.verdict,
    total_time_ms: input.report.totalTimeMs,
    leak_rate_mb_per_round: input.report.leakRateMBPerRound,
    average_latency_ms: input.report.averageLatencyMs,
    peak_memory_mb: input.report.peakMemoryMB,
    baseline_memory_mb: input.report.baselineMemoryMB,
    hardware_label: input.payload.hardwareLabel,
    share_scores: input.payload.scores,
    share_taunt: input.payload.taunt,
  },
})
