import { TEST_SUITE_VERSION } from '@/data/suite-version'
import {
  createRunHashMaterial,
  generateRunHash,
  type RunHashRawOutput,
} from '@/lib/run-hash'
import {
  createReplayHashMaterial,
  generateReplayHash,
  type ReplayHashRawOutput,
} from '@/lib/replay-hash'
import { getModelFingerprint } from '@/lib/model-fingerprint'
import type {
  BBBHardwareReport,
  BBBPhaseSummary,
  BBBRawOutputEntry,
  BBBReportBundle,
} from '@/types/report'

const BBB_REPORT_VERSION = '3.4'
const APP_VERSION = '0.0.1'
const WEBLLM_VERSION = '0.2.78'

export interface CreateBBBReportBundleInput {
  modelId: string
  modelName?: string
  testSuiteVersion?: string
  phases: Record<string, BBBPhaseSummary>
  totalScore: number
  rawOutputs: BBBRawOutputEntry[]
  replayHash?: string
  modelFingerprint?: string
  timestamp?: string
  hardware?: Partial<BBBHardwareReport>
  isMobile?: boolean
}

const getUserAgent = (): string =>
  typeof navigator !== 'undefined' && navigator.userAgent
    ? navigator.userAgent
    : 'Unknown UA'

const detectBrowser = (ua: string): string => {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Unknown Browser'
}

const detectOs = (ua: string): string => {
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Windows NT/.test(ua)) return 'Windows'
  if (/Linux/.test(ua)) return 'Linux'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  return 'Unknown OS'
}

const estimateVramGb = (hardware?: Partial<BBBHardwareReport>): number =>
  hardware?.estimated_vram_gb ?? 0

const resolveHardware = (
  overrides?: Partial<BBBHardwareReport>
): BBBHardwareReport => {
  const ua = getUserAgent()
  return {
    tier: overrides?.tier ?? 'UNKNOWN',
    gpu: overrides?.gpu ?? 'Unknown GPU',
    browser: overrides?.browser ?? detectBrowser(ua),
    os: overrides?.os ?? detectOs(ua),
    estimated_vram_gb: estimateVramGb(overrides),
  }
}

const resolveIsMobile = (value?: boolean): boolean => {
  if (typeof value === 'boolean') return value
  return /Android|iPhone|iPad|iPod/i.test(getUserAgent())
}

const normalizeRawOutputs = (
  modelId: string,
  entries: BBBRawOutputEntry[]
): BBBRawOutputEntry[] =>
  entries.map((entry, index) => ({
    ...entry,
    model_id: entry.model_id || modelId,
    run: Number(entry.run) || index + 1,
    output: String(entry.output ?? ''),
  }))

const toRunHashRawOutputs = (entries: BBBRawOutputEntry[]): RunHashRawOutput[] =>
  entries.map((entry) => ({
    test_id: entry.test_id,
    run: entry.run,
    output: entry.output,
  }))

const toReplayHashRawOutputs = (
  entries: BBBRawOutputEntry[]
): ReplayHashRawOutput[] =>
  entries.map((entry) => ({
    test_id: entry.test_id,
    run: entry.run,
    ttft_ms: entry.ttft_ms ?? null,
    total_time_ms: entry.total_time_ms ?? null,
    char_timestamps: entry.char_timestamps ?? [],
  }))

export const createBBBReportBundle = async (
  input: CreateBBBReportBundleInput
): Promise<BBBReportBundle> => {
  const timestamp = input.timestamp ?? new Date().toISOString()
  const testSuiteVersion = input.testSuiteVersion ?? TEST_SUITE_VERSION
  const rawOutputs = normalizeRawOutputs(input.modelId, input.rawOutputs)

  const material = createRunHashMaterial({
    testSuiteVersion,
    modelId: input.modelId,
    rawOutputs: toRunHashRawOutputs(rawOutputs),
  })
  const runHash = await generateRunHash(material)
  const replayHashMaterial = createReplayHashMaterial({
    testSuiteVersion,
    modelId: input.modelId,
    rawOutputs: toReplayHashRawOutputs(rawOutputs),
  })
  const replayHash = await generateReplayHash(replayHashMaterial)

  const modelFingerprint =
    input.modelFingerprint ?? (await getModelFingerprint(input.modelId))

  return {
    report: {
      version: BBB_REPORT_VERSION,
      timestamp,
      app_version: APP_VERSION,
      test_suite_version: testSuiteVersion,
      run_hash: runHash,
      replay_hash: input.replayHash ?? replayHash,
      is_mobile: resolveIsMobile(input.isMobile),
      hardware: resolveHardware(input.hardware),
      models_tested: [
        {
          model_id: input.modelId,
          model_name: input.modelName ?? input.modelId,
          model_weight_fingerprint: modelFingerprint,
          webllm_version: WEBLLM_VERSION,
          phases: input.phases,
          total_score: input.totalScore,
        },
      ],
      ollama_baseline: null,
    },
    rawOutputs: {
      raw_outputs: rawOutputs,
    },
  }
}

export const serializeBBBReportBundle = (bundle: BBBReportBundle): {
  reportJson: string
  rawOutputsJson: string
} => ({
  reportJson: JSON.stringify(bundle.report, null, 2),
  rawOutputsJson: JSON.stringify(bundle.rawOutputs, null, 2),
})
