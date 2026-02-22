import type {
  PublicReportRecord,
  PublishMode,
  PublishReportInput,
  ShareGrade,
  StoredReportRow,
} from './contracts.js'
import { normalizeModelId } from './model-normalize.js'
import { SupabaseRestError, supabaseRest } from './supabase.js'

const DEFAULT_MODE: PublishMode = 'quick'
const VALID_MODES: PublishMode[] = ['arena', 'quick', 'gauntlet', 'stress']
const VALID_GRADES: ShareGrade[] = ['S', 'A', 'B', 'C', 'F']

const firstRow = <T>(value: T[] | T | null | undefined): T | undefined => {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null
  }
  return null
}

const toNullableInt = (value: unknown): number | null => {
  const numberValue = toNullableNumber(value)
  if (numberValue === null) return null
  return Math.round(numberValue)
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }
  return null
}

const firstMode = (...values: unknown[]): PublishMode => {
  const mode = firstString(...values)
  if (!mode) return DEFAULT_MODE
  return VALID_MODES.includes(mode as PublishMode) ? (mode as PublishMode) : DEFAULT_MODE
}

const firstGrade = (...values: unknown[]): ShareGrade => {
  const grade = firstString(...values)
  if (!grade) return 'C'
  return VALID_GRADES.includes(grade as ShareGrade) ? (grade as ShareGrade) : 'C'
}

const readErrorMessage = (error: unknown): string => {
  if (!(error instanceof SupabaseRestError)) {
    return error instanceof Error ? error.message : String(error)
  }

  const payload = error.payload
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    return String((payload as { message?: unknown }).message || error.message)
  }

  return error.message
}

const isSchemaDriftError = (error: unknown): boolean => {
  const message = readErrorMessage(error).toLowerCase()
  return (
    message.includes('column') ||
    message.includes('schema cache') ||
    message.includes('record') ||
    message.includes('could not find') ||
    message.includes('does not exist')
  )
}

const buildLegacyRawJson = (payload: PublishReportInput): Record<string, unknown> => ({
  mode: payload.mode,
  scenario_id: payload.scenario_id,
  scenario_name: payload.scenario_name,
  model_id: payload.model_id,
  score: payload.score,
  grade: payload.grade,
  tier: payload.tier,
  pass_rate: payload.pass_rate ?? null,
  total_rounds: payload.total_rounds ?? null,
  passed_rounds: payload.passed_rounds ?? null,
  run_hash: payload.run_hash ?? null,
  replay_hash: payload.replay_hash ?? null,
  source_run_ref: payload.source_run_ref ?? null,
  gladiator_name: payload.gladiator_name,
  github_username: payload.github_username ?? null,
  device_id: payload.device_id,
  canonical_model_id: payload.canonical_model_id ?? null,
  model_family: payload.model_family ?? null,
  param_size: payload.param_size ?? null,
  quantization: payload.quantization ?? null,
  gpu_name: payload.gpu_name ?? null,
  gpu_vendor: payload.gpu_vendor ?? null,
  gpu_raw: payload.gpu_raw ?? null,
  os_name: payload.os_name ?? null,
  browser_name: payload.browser_name ?? null,
  vram_gb: payload.vram_gb ?? null,
  report_summary: payload.report_summary,
})

const mergePublishMeta = (
  summary: Record<string, unknown>,
  payload: PublishReportInput,
  normalizedModel: ReturnType<typeof normalizeModelId>
): Record<string, unknown> => {
  const existingMeta = asRecord(summary._bbb_publish_meta)

  return {
    ...summary,
    _bbb_publish_meta: {
      ...(existingMeta || {}),
      identity: {
        gladiator_name: payload.gladiator_name,
        github_username: payload.github_username ?? null,
        device_id: payload.device_id,
      },
      canonical_model: normalizedModel,
      self_reported_hardware: {
        gpu_name: payload.gpu_name ?? null,
        gpu_vendor: payload.gpu_vendor ?? null,
        gpu_raw: payload.gpu_raw ?? null,
        os_name: payload.os_name ?? null,
        browser_name: payload.browser_name ?? null,
        vram_gb: payload.vram_gb ?? null,
        source: 'self-reported',
      },
    },
  }
}

const toPublicReport = (row: StoredReportRow): PublicReportRecord => {
  const summary = asRecord(row.report_summary)
  const raw = asRecord(row.raw_json)
  const rawSummary = asRecord(raw?.report_summary)
  const summaryMeta = asRecord(summary?._bbb_publish_meta)
  const identityMeta = asRecord(summaryMeta?.identity)
  const canonicalMeta = asRecord(summaryMeta?.canonical_model)
  const hardwareMeta = asRecord(summaryMeta?.self_reported_hardware)

  const mode = firstMode(row.mode, raw?.mode)
  const scenarioId =
    firstString(row.scenario_id, summary?.scenario_id, raw?.scenario_id) || 'unknown-scenario'
  const scenarioName =
    firstString(row.scenario_name, summary?.scenario_name, raw?.scenario_name) || 'Unknown Scenario'
  const modelId = firstString(row.model_id, summary?.model_id, raw?.model_id) || 'Unknown Model'
  const score = toNullableNumber(row.score) ?? toNullableNumber(raw?.score) ?? 0
  const grade = firstGrade(row.grade, raw?.grade)
  const tier = firstString(row.tier, summary?.tier, raw?.tier) || 'UNKNOWN'

  const passRate =
    toNullableNumber(row.pass_rate) ??
    toNullableNumber(summary?.pass_rate) ??
    toNullableNumber(raw?.pass_rate)
  const totalRounds =
    toNullableInt(row.total_rounds) ??
    toNullableInt(summary?.total_rounds) ??
    toNullableInt(raw?.total_rounds)
  const passedRounds =
    toNullableInt(row.passed_rounds) ??
    toNullableInt(summary?.passed_rounds) ??
    toNullableInt(raw?.passed_rounds)

  return {
    id: row.id,
    mode,
    scenario_id: scenarioId,
    scenario_name: scenarioName,
    model_id: modelId,
    score,
    grade,
    tier,
    pass_rate: passRate,
    total_rounds: totalRounds,
    passed_rounds: passedRounds,
    run_hash: firstString(row.run_hash, summary?.run_hash, raw?.run_hash),
    replay_hash: firstString(row.replay_hash, summary?.replay_hash, raw?.replay_hash),
    source_run_ref: firstString(
      row.source_run_ref,
      summary?.source_run_ref,
      raw?.source_run_ref
    ),
    gladiator_name:
      firstString(row.gladiator_name, identityMeta?.gladiator_name, raw?.gladiator_name) ||
      'Anonymous',
    github_username: firstString(
      row.github_username,
      identityMeta?.github_username,
      raw?.github_username
    ),
    device_id:
      firstString(row.device_id, identityMeta?.device_id, raw?.device_id) ||
      'unknown-device',
    canonical_model_id: firstString(
      row.canonical_model_id,
      canonicalMeta?.canonical_model_id,
      raw?.canonical_model_id
    ),
    model_family: firstString(
      row.model_family,
      canonicalMeta?.model_family,
      raw?.model_family
    ),
    param_size: firstString(
      row.param_size,
      canonicalMeta?.param_size,
      raw?.param_size
    ),
    quantization: firstString(
      row.quantization,
      canonicalMeta?.quantization,
      raw?.quantization
    ),
    gpu_name: firstString(row.gpu_name, hardwareMeta?.gpu_name, raw?.gpu_name),
    gpu_vendor: firstString(row.gpu_vendor, hardwareMeta?.gpu_vendor, raw?.gpu_vendor),
    gpu_raw: firstString(row.gpu_raw, hardwareMeta?.gpu_raw, raw?.gpu_raw),
    os_name: firstString(row.os_name, hardwareMeta?.os_name, raw?.os_name),
    browser_name: firstString(row.browser_name, hardwareMeta?.browser_name, raw?.browser_name),
    vram_gb:
      toNullableNumber(row.vram_gb) ??
      toNullableNumber(hardwareMeta?.vram_gb) ??
      toNullableNumber(raw?.vram_gb),
    report_summary: summary || rawSummary || raw || {},
    created_at: firstString(row.created_at) || new Date(0).toISOString(),
  }
}

const buildFullInsertRow = (payload: PublishReportInput) => {
  const normalizedModel = normalizeModelId(payload.model_id)
  const mergedSummary = mergePublishMeta(payload.report_summary, payload, normalizedModel)

  return {
    mode: payload.mode,
    scenario_id: payload.scenario_id,
    scenario_name: payload.scenario_name,
    model_id: payload.model_id,
    score: payload.score,
    grade: payload.grade,
    tier: payload.tier,
    pass_rate: payload.pass_rate ?? null,
    total_rounds: payload.total_rounds ?? null,
    passed_rounds: payload.passed_rounds ?? null,
    run_hash: payload.run_hash ?? null,
    replay_hash: payload.replay_hash ?? null,
    source_run_ref: payload.source_run_ref ?? null,
    gladiator_name: payload.gladiator_name,
    github_username: payload.github_username ?? null,
    device_id: payload.device_id,
    canonical_model_id: normalizedModel.canonical_model_id,
    model_family: normalizedModel.model_family,
    param_size: normalizedModel.param_size,
    quantization: normalizedModel.quantization,
    gpu_name: payload.gpu_name ?? null,
    gpu_vendor: payload.gpu_vendor ?? null,
    gpu_raw: payload.gpu_raw ?? null,
    os_name: payload.os_name ?? null,
    browser_name: payload.browser_name ?? null,
    vram_gb: payload.vram_gb ?? null,
    report_summary: mergedSummary,
  }
}

const buildSchemaFallbackRow = (
  payload: PublishReportInput,
  mergedSummary?: Record<string, unknown>
) => ({
  mode: payload.mode,
  scenario_id: payload.scenario_id,
  scenario_name: payload.scenario_name,
  model_id: payload.model_id,
  score: payload.score,
  grade: payload.grade,
  tier: payload.tier,
  pass_rate: payload.pass_rate ?? null,
  total_rounds: payload.total_rounds ?? null,
  passed_rounds: payload.passed_rounds ?? null,
  run_hash: payload.run_hash ?? null,
  replay_hash: payload.replay_hash ?? null,
  source_run_ref: payload.source_run_ref ?? null,
  report_summary: mergedSummary || payload.report_summary,
})

const insertAndRead = async (body: Record<string, unknown>): Promise<PublicReportRecord> => {
  const inserted = await supabaseRest<StoredReportRow[] | StoredReportRow>('bbb_reports?select=*', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body,
  })

  const row = firstRow(inserted.data)
  if (!row || !row.id) {
    throw new Error('Insert succeeded but no row returned')
  }
  return toPublicReport(row)
}

const findExistingByRunHash = async (runHash: string): Promise<PublicReportRecord | null> => {
  try {
    const selected = await supabaseRest<StoredReportRow[] | StoredReportRow>(
      `bbb_reports?run_hash=eq.${encodeURIComponent(runHash)}&select=*&limit=1`
    )
    const row = firstRow(selected.data)
    return row ? toPublicReport(row) : null
  } catch (error) {
    if (isSchemaDriftError(error)) return null
    throw error
  }
}

const findExistingByModeAndSourceRef = async (
  mode: PublishMode,
  sourceRunRef: string
): Promise<PublicReportRecord | null> => {
  try {
    const selected = await supabaseRest<StoredReportRow[] | StoredReportRow>(
      `bbb_reports?mode=eq.${encodeURIComponent(mode)}&source_run_ref=eq.${encodeURIComponent(sourceRunRef)}&select=*&limit=1`
    )
    const row = firstRow(selected.data)
    return row ? toPublicReport(row) : null
  } catch (error) {
    if (isSchemaDriftError(error)) return null
    throw error
  }
}

export const insertReport = async (payload: PublishReportInput): Promise<PublicReportRecord> => {
  if (payload.run_hash) {
    const byRunHash = await findExistingByRunHash(payload.run_hash)
    if (byRunHash) return byRunHash
  }

  if (
    (payload.mode === 'arena' || payload.mode === 'stress') &&
    payload.source_run_ref
  ) {
    const bySourceRef = await findExistingByModeAndSourceRef(
      payload.mode,
      payload.source_run_ref
    )
    if (bySourceRef) return bySourceRef
  }

  const fullInsertRow = buildFullInsertRow(payload)
  try {
    return await insertAndRead(fullInsertRow)
  } catch (error) {
    if (!isSchemaDriftError(error)) {
      throw error
    }
  }

  const schemaFallbackRow = buildSchemaFallbackRow(
    payload,
    fullInsertRow.report_summary as Record<string, unknown>
  )
  try {
    return await insertAndRead(schemaFallbackRow)
  } catch (error) {
    if (!isSchemaDriftError(error)) {
      throw error
    }
  }

  const legacyRow = {
    model_id: payload.model_id,
    score: Math.round(payload.score),
    grade: payload.grade,
    tier: payload.tier,
    raw_json: buildLegacyRawJson(payload),
  }
  return insertAndRead(legacyRow)
}

export const getReportById = async (id: string): Promise<PublicReportRecord | null> => {
  const selected = await supabaseRest<StoredReportRow[] | StoredReportRow>(
    `bbb_reports?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  )

  const row = firstRow(selected.data)
  if (!row) return null
  return toPublicReport(row)
}

export const listReports = async (options?: {
  limit?: number
  mode?: PublishMode | 'all'
}): Promise<PublicReportRecord[]> => {
  const requestedLimit = options?.limit ?? 25
  const safeLimit = Math.max(1, Math.min(200, requestedLimit))

  const selected = await supabaseRest<StoredReportRow[] | StoredReportRow>(
    `bbb_reports?select=*&order=score.desc,created_at.desc&limit=${safeLimit}`
  )

  const rows = Array.isArray(selected.data)
    ? selected.data
    : selected.data
      ? [selected.data]
      : []

  const normalized = rows.filter((row) => !!row.id).map((row) => toPublicReport(row))

  if (!options?.mode || options.mode === 'all') {
    return normalized
  }

  return normalized.filter((row) => row.mode === options.mode)
}
