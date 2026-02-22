import {
  badRequest,
  getRequestBaseUrl,
  json,
  methodNotAllowed,
  readBodyWithOptions,
  serverError,
  tooManyRequests,
} from './_lib/http.js'
import { loadServerEnv } from './_lib/env.js'
import { enforceUploadRateLimit } from './_lib/rate-limit.js'
import { validateImportLocalRunInput } from './_lib/import-validation.js'
import { verifyImportHashes } from './_lib/import-hash-verify.js'
import { scoreImportedRun } from './_lib/import-score.js'
import { insertReport } from './_lib/report-store.js'
import { buildReportLinks } from './_lib/report-links.js'

const MAX_IMPORT_BODY_BYTES = 4 * 1024 * 1024
const MAX_IMPORT_RAW_OUTPUTS = 5000

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value * 100) / 100
}

export default async function handler(req: any, res?: any): Promise<void | Response> {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  let rawBody: unknown
  try {
    rawBody = await readBodyWithOptions<unknown>(req, {
      maxBytes: MAX_IMPORT_BODY_BYTES,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('too large')) {
      return badRequest(res, message)
    }
    return badRequest(res, 'Invalid JSON request body')
  }

  try {
    const parsed = validateImportLocalRunInput(rawBody, {
      maxRawOutputs: MAX_IMPORT_RAW_OUTPUTS,
    })
    if (!parsed.ok) {
      return badRequest(res, parsed.error)
    }

    const limiter = await enforceUploadRateLimit(req)
    if (!limiter.allowed) {
      return tooManyRequests(res, limiter.reason || 'Too many requests')
    }

    let hashVerification
    let scored
    try {
      hashVerification = verifyImportHashes({
        bbb_report: parsed.value.bbb_report,
        bbb_raw_outputs: parsed.value.bbb_raw_outputs,
      })

      scored = scoreImportedRun({
        bbb_report: parsed.value.bbb_report,
        bbb_raw_outputs: parsed.value.bbb_raw_outputs,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return badRequest(res, message)
    }

    const hardware = asRecord(parsed.value.bbb_report.hardware)
    const firstModel = parsed.value.bbb_report.models_tested[0]

    const created = await insertReport({
      mode: scored.score.mode,
      scenario_id: scored.score.scenario_id,
      scenario_name: scored.score.scenario_name,
      model_id: firstModel.model_id,
      score: scored.score.score,
      grade: scored.score.grade,
      tier: toNullableString(hardware?.tier) || 'UNKNOWN',
      pass_rate: scored.score.pass_rate,
      total_rounds: scored.score.total_rounds,
      passed_rounds: scored.score.passed_rounds,
      run_hash: hashVerification.run_hash,
      replay_hash: hashVerification.replay_hash,
      source_run_ref: `import-${hashVerification.run_hash}`,
      gladiator_name: parsed.value.gladiator_name,
      github_username: parsed.value.github_username,
      device_id: parsed.value.device_id,
      canonical_model_id: null,
      model_family: null,
      param_size: null,
      quantization: null,
      gpu_name: toNullableString(hardware?.gpu),
      gpu_vendor: toNullableString(hardware?.gpu_vendor),
      gpu_raw: toNullableString(hardware?.gpu_raw),
      os_name: toNullableString(hardware?.os_name) || toNullableString(hardware?.os),
      browser_name:
        toNullableString(hardware?.browser_name) || toNullableString(hardware?.browser),
      vram_gb:
        toNullableNumber(hardware?.estimated_vram_gb) ||
        toNullableNumber(hardware?.vram_gb),
      ingest_source: 'import_local',
      integrity_status: 'hash_verified',
      report_summary: {
        mode: scored.score.mode,
        source: 'import_local',
        scenario_id: scored.score.scenario_id,
        scenario_name: scored.score.scenario_name,
        imported_report_version: parsed.value.bbb_report.version || null,
        imported_test_suite_version: parsed.value.bbb_report.test_suite_version,
        imported_model_name: firstModel.model_name || null,
        imported_total_score: firstModel.total_score ?? null,
        imported_timestamp: parsed.value.bbb_report.timestamp || null,
        hash_verification: hashVerification,
        scoring_diagnostics: scored.diagnostics,
        import_info: {
          imported_at: new Date().toISOString(),
          raw_outputs_count: parsed.value.bbb_raw_outputs.raw_outputs.length,
          expected_tests: scored.diagnostics.expected_tests,
          observed_outputs: scored.diagnostics.observed_outputs,
        },
      },
      bbb_report: parsed.value.bbb_report as unknown as Record<string, unknown>,
    })

    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(req, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, created.id)

    return json(res, 200, links)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(res, message)
  }
}
