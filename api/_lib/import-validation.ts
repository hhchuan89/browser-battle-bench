import { isUuidLike } from './id.js'
import type {
  ImportBbbReportFile,
  ImportLocalRunRequestBody,
  ImportRawOutputEntry,
  ImportRawOutputsFile,
  ImportValidatedInput,
} from './import-contracts.js'

const HASH_REGEX = /^[a-f0-9]{64}$/i
const GITHUB_USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/

interface ValidationOk {
  ok: true
  value: ImportValidatedInput
}

interface ValidationError {
  ok: false
  error: string
}

export type ImportValidationResult = ValidationOk | ValidationError

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (
  value: unknown,
  field: string,
  maxLength: number,
  required = true
): string | null => {
  if (value === undefined || value === null) {
    if (!required) return null
    throw new Error(`${field} is required`)
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed && required) {
    throw new Error(`${field} is required`)
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} exceeds max length (${maxLength})`)
  }
  return trimmed || null
}

const readHash = (value: unknown, field: string): string => {
  const hash = readString(value, field, 128, true) as string
  if (!HASH_REGEX.test(hash)) {
    throw new Error(`${field} must be a 64-char SHA-256 hex`)
  }
  return hash.toLowerCase()
}

const readFiniteNumber = (
  value: unknown,
  field: string,
  min: number,
  max: number,
  required = false
): number | null => {
  if (value === undefined || value === null) {
    if (!required) return null
    throw new Error(`${field} is required`)
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`)
  }
  if (value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}`)
  }
  return value
}

const readGithubUsername = (value: unknown): string | null => {
  const raw = readString(value, 'github_username', 64, false)
  if (!raw) return null

  const normalized = raw.replace(/^@+/, '')
  if (!normalized) return null
  if (normalized.length > 39) {
    throw new Error('github_username exceeds max length (39)')
  }
  if (!GITHUB_USERNAME_REGEX.test(normalized)) {
    throw new Error('github_username contains invalid characters')
  }
  return normalized
}

const normalizeRawEntry = (value: unknown, index: number): ImportRawOutputEntry => {
  if (!isRecord(value)) {
    throw new Error(`bbb_raw_outputs.raw_outputs[${index}] must be an object`)
  }

  const runValue = readFiniteNumber(value.run, `bbb_raw_outputs.raw_outputs[${index}].run`, 1, 100000, true)
  if (runValue === null) {
    throw new Error(`bbb_raw_outputs.raw_outputs[${index}].run is required`)
  }

  const charTimestampsRaw = value.char_timestamps
  const charTimestamps = Array.isArray(charTimestampsRaw)
    ? charTimestampsRaw
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry))
    : []

  return {
    test_id: readString(value.test_id, `bbb_raw_outputs.raw_outputs[${index}].test_id`, 120, true) as string,
    run: Math.round(runValue),
    model_id: readString(value.model_id, `bbb_raw_outputs.raw_outputs[${index}].model_id`, 240, false) || undefined,
    output: readString(value.output, `bbb_raw_outputs.raw_outputs[${index}].output`, 120000, true) as string,
    ttft_ms: readFiniteNumber(value.ttft_ms, `bbb_raw_outputs.raw_outputs[${index}].ttft_ms`, 0, 1_000_000, false),
    total_time_ms: readFiniteNumber(
      value.total_time_ms,
      `bbb_raw_outputs.raw_outputs[${index}].total_time_ms`,
      0,
      10_000_000,
      false
    ),
    char_timestamps: charTimestamps,
  }
}

const normalizeRawOutputsFile = (
  value: unknown,
  maxRawOutputs: number
): ImportRawOutputsFile => {
  if (!isRecord(value)) {
    throw new Error('bbb_raw_outputs must be an object')
  }

  if (!Array.isArray(value.raw_outputs)) {
    throw new Error('bbb_raw_outputs.raw_outputs must be an array')
  }

  if (value.raw_outputs.length === 0) {
    throw new Error('bbb_raw_outputs.raw_outputs must not be empty')
  }

  if (value.raw_outputs.length > maxRawOutputs) {
    throw new Error(`bbb_raw_outputs.raw_outputs exceeds max entries (${maxRawOutputs})`)
  }

  return {
    raw_outputs: value.raw_outputs.map((entry, index) => normalizeRawEntry(entry, index)),
  }
}

const normalizeReportFile = (value: unknown): ImportBbbReportFile => {
  if (!isRecord(value)) {
    throw new Error('bbb_report must be an object')
  }

  if (!Array.isArray(value.models_tested) || value.models_tested.length === 0) {
    throw new Error('bbb_report.models_tested must contain at least 1 model')
  }

  const firstModel = value.models_tested[0]
  if (!isRecord(firstModel)) {
    throw new Error('bbb_report.models_tested[0] must be an object')
  }

  return {
    version: readString(value.version, 'bbb_report.version', 32, false) || undefined,
    timestamp: readString(value.timestamp, 'bbb_report.timestamp', 80, false) || undefined,
    test_suite_version: readString(value.test_suite_version, 'bbb_report.test_suite_version', 64, true) as string,
    run_hash: readHash(value.run_hash, 'bbb_report.run_hash'),
    replay_hash: readHash(value.replay_hash, 'bbb_report.replay_hash'),
    hardware: isRecord(value.hardware) ? value.hardware : undefined,
    models_tested: [
      {
        model_id: readString(firstModel.model_id, 'bbb_report.models_tested[0].model_id', 240, true) as string,
        model_name:
          readString(firstModel.model_name, 'bbb_report.models_tested[0].model_name', 240, false) || undefined,
        total_score: readFiniteNumber(
          firstModel.total_score,
          'bbb_report.models_tested[0].total_score',
          0,
          100,
          false
        ) ?? undefined,
        phases: isRecord(firstModel.phases) ? firstModel.phases : undefined,
      },
    ],
  }
}

export const validateImportLocalRunInput = (
  raw: unknown,
  options?: { maxRawOutputs?: number }
): ImportValidationResult => {
  const maxRawOutputs = options?.maxRawOutputs ?? 5000

  try {
    if (!isRecord(raw)) {
      throw new Error('request body must be a JSON object')
    }

    const gladiatorName = readString(raw.gladiator_name, 'gladiator_name', 32, true) as string
    if (gladiatorName.length < 2) {
      throw new Error('gladiator_name must be at least 2 characters')
    }

    const deviceId = readString(raw.device_id, 'device_id', 64, true) as string
    if (!isUuidLike(deviceId)) {
      throw new Error('device_id must be a valid UUID')
    }

    const normalized: ImportValidatedInput = {
      gladiator_name: gladiatorName,
      github_username: readGithubUsername(raw.github_username),
      device_id: deviceId,
      bbb_report: normalizeReportFile(raw.bbb_report),
      bbb_raw_outputs: normalizeRawOutputsFile(raw.bbb_raw_outputs, maxRawOutputs),
    }

    return {
      ok: true,
      value: normalized,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
