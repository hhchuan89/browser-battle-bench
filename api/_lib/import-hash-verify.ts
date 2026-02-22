import { createHash } from 'node:crypto'
import type { ImportBbbReportFile, ImportHashVerificationResult, ImportRawOutputsFile } from './import-contracts.js'

interface RunHashRawOutput {
  test_id: string
  run: number
  output: string
}

interface ReplayHashRawOutput {
  test_id: string
  run: number
  ttft_ms: number | null
  total_time_ms: number | null
  char_timestamps: number[]
}

interface RunHashMaterial {
  test_suite_version: string
  test_case_ids: string[]
  model_id: string
  raw_outputs: RunHashRawOutput[]
}

interface ReplayHashMaterial {
  test_suite_version: string
  model_id: string
  timing_outputs: ReplayHashRawOutput[]
}

const sha256Hex = (payload: string): string =>
  createHash('sha256').update(payload).digest('hex')

const compareOutputs = (a: { test_id: string; run: number }, b: { test_id: string; run: number }): number => {
  if (a.test_id !== b.test_id) {
    return a.test_id.localeCompare(b.test_id)
  }
  return a.run - b.run
}

const toFiniteNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const normalizeCharTimestamps = (input?: number[]): number[] => {
  if (!Array.isArray(input)) return []
  return input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
}

const buildRunHashMaterial = (input: {
  testSuiteVersion: string
  modelId: string
  rawOutputs: ImportRawOutputsFile['raw_outputs']
}): RunHashMaterial => {
  const normalized = input.rawOutputs
    .map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      output: String(entry.output ?? ''),
    }))
    .sort(compareOutputs)

  const testCaseIds = Array.from(new Set(normalized.map((entry) => entry.test_id))).sort((a, b) =>
    a.localeCompare(b)
  )

  return {
    test_suite_version: input.testSuiteVersion,
    test_case_ids: testCaseIds,
    model_id: input.modelId,
    raw_outputs: normalized,
  }
}

const buildReplayHashMaterial = (input: {
  testSuiteVersion: string
  modelId: string
  rawOutputs: ImportRawOutputsFile['raw_outputs']
}): ReplayHashMaterial => {
  const normalized = input.rawOutputs
    .map((entry) => ({
      test_id: entry.test_id,
      run: Number(entry.run),
      ttft_ms: toFiniteNumberOrNull(entry.ttft_ms),
      total_time_ms: toFiniteNumberOrNull(entry.total_time_ms),
      char_timestamps: normalizeCharTimestamps(entry.char_timestamps),
    }))
    .sort(compareOutputs)

  return {
    test_suite_version: input.testSuiteVersion,
    model_id: input.modelId,
    timing_outputs: normalized,
  }
}

export const verifyImportHashes = (input: {
  bbb_report: ImportBbbReportFile
  bbb_raw_outputs: ImportRawOutputsFile
}): ImportHashVerificationResult => {
  const report = input.bbb_report
  const firstModel = report.models_tested[0]
  const modelId = firstModel.model_id

  const runMaterial = buildRunHashMaterial({
    testSuiteVersion: report.test_suite_version,
    modelId,
    rawOutputs: input.bbb_raw_outputs.raw_outputs,
  })

  const replayMaterial = buildReplayHashMaterial({
    testSuiteVersion: report.test_suite_version,
    modelId,
    rawOutputs: input.bbb_raw_outputs.raw_outputs,
  })

  const computedRunHash = sha256Hex(JSON.stringify(runMaterial))
  const computedReplayHash = sha256Hex(JSON.stringify(replayMaterial))

  if (computedRunHash !== report.run_hash) {
    throw new Error('run_hash mismatch (possible tampering)')
  }
  if (!report.replay_hash) {
    throw new Error('replay_hash is required for import')
  }
  if (computedReplayHash !== report.replay_hash) {
    throw new Error('replay_hash mismatch (possible tampering)')
  }

  return {
    run_hash: report.run_hash,
    replay_hash: report.replay_hash,
    computed_run_hash: computedRunHash,
    computed_replay_hash: computedReplayHash,
  }
}
