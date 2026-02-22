import type { PublishMode, PublishReportInput, ShareGrade } from './contracts.js'

const VALID_MODES: PublishMode[] = ['arena', 'quick', 'gauntlet', 'stress']
const VALID_GRADES: ShareGrade[] = ['S', 'A', 'B', 'C', 'F']

interface ValidationOk {
  ok: true
  value: PublishReportInput
}

interface ValidationError {
  ok: false
  error: string
}

export type ValidationResult = ValidationOk | ValidationError

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readTrimmedString = (
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
  if (!trimmed && required) throw new Error(`${field} is required`)
  if (trimmed.length > maxLength) {
    throw new Error(`${field} exceeds max length (${maxLength})`)
  }
  return trimmed || null
}

const readNumber = (
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

  return Math.round(value * 100) / 100
}

const readInt = (
  value: unknown,
  field: string,
  min: number,
  max: number
): number | null => {
  const numberValue = readNumber(value, field, min, max, false)
  if (numberValue === null) return null
  return Math.round(numberValue)
}

const readMode = (value: unknown): PublishMode => {
  const mode = readTrimmedString(value, 'mode', 32, true)
  if (!mode || !VALID_MODES.includes(mode as PublishMode)) {
    throw new Error(`mode must be one of: ${VALID_MODES.join(', ')}`)
  }
  return mode as PublishMode
}

const readGrade = (value: unknown): ShareGrade => {
  const grade = readTrimmedString(value, 'grade', 4, true)
  if (!grade || !VALID_GRADES.includes(grade as ShareGrade)) {
    throw new Error(`grade must be one of: ${VALID_GRADES.join(', ')}`)
  }
  return grade as ShareGrade
}

const validateBbbReport = (input: PublishReportInput): void => {
  if (input.mode !== 'quick' && input.mode !== 'gauntlet') return
  if (!input.bbb_report) return

  const runHash = input.bbb_report.run_hash
  if (typeof runHash === 'string' && input.run_hash && runHash !== input.run_hash) {
    throw new Error('run_hash mismatch between payload and bbb_report')
  }

  const modelsTested = input.bbb_report.models_tested
  if (Array.isArray(modelsTested) && modelsTested.length > 0) {
    const first = modelsTested[0]
    if (isRecord(first) && typeof first.total_score === 'number' && Number.isFinite(first.total_score)) {
      const diff = Math.abs(first.total_score - input.score)
      if (diff > 1) {
        throw new Error('score mismatch with bbb_report total_score')
      }
    }
  }
}

export const validatePublishReportInput = (raw: unknown): ValidationResult => {
  try {
    if (!isRecord(raw)) {
      throw new Error('request body must be a JSON object')
    }

    const mode = readMode(raw.mode)
    const score = readNumber(raw.score, 'score', 0, 100, true)
    if (score === null) throw new Error('score is required')

    const summary = raw.report_summary
    if (!isRecord(summary)) {
      throw new Error('report_summary must be an object')
    }

    const bbbReport = raw.bbb_report
    if (bbbReport !== undefined && bbbReport !== null && !isRecord(bbbReport)) {
      throw new Error('bbb_report must be an object when provided')
    }

    const value: PublishReportInput = {
      mode,
      scenario_id: readTrimmedString(raw.scenario_id, 'scenario_id', 120, true) as string,
      scenario_name: readTrimmedString(raw.scenario_name, 'scenario_name', 240, true) as string,
      model_id: readTrimmedString(raw.model_id, 'model_id', 240, true) as string,
      score,
      grade: readGrade(raw.grade),
      tier: readTrimmedString(raw.tier, 'tier', 16, true) as string,
      pass_rate: readNumber(raw.pass_rate, 'pass_rate', 0, 100, false),
      total_rounds: readInt(raw.total_rounds, 'total_rounds', 0, 100000),
      passed_rounds: readInt(raw.passed_rounds, 'passed_rounds', 0, 100000),
      run_hash: readTrimmedString(raw.run_hash, 'run_hash', 128, false),
      replay_hash: readTrimmedString(raw.replay_hash, 'replay_hash', 128, false),
      source_run_ref: readTrimmedString(raw.source_run_ref, 'source_run_ref', 128, false),
      report_summary: summary,
      bbb_report: bbbReport ? (bbbReport as Record<string, unknown>) : undefined,
    }

    validateBbbReport(value)

    return {
      ok: true,
      value,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
