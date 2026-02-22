import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/import-report.js'
import { loadServerEnv } from '../../api/_lib/env.js'
import { enforceUploadRateLimit } from '../../api/_lib/rate-limit.js'
import { validateImportLocalRunInput } from '../../api/_lib/import-validation.js'
import { verifyImportHashes } from '../../api/_lib/import-hash-verify.js'
import { scoreImportedRun } from '../../api/_lib/import-score.js'
import { insertReport } from '../../api/_lib/report-store.js'
import { buildReportLinks } from '../../api/_lib/report-links.js'

vi.mock('../../api/_lib/env.js', () => ({
  loadServerEnv: vi.fn(() => ({
    supabaseUrl: 'https://example.supabase.co',
    supabaseServiceRoleKey: 'test-key',
    appBaseUrl: 'https://browserbattlebench.vercel.app',
    uploadLimitPerWindow: 20,
    uploadWindowMinutes: 10,
    rateLimitSalt: '',
  })),
}))

vi.mock('../../api/_lib/rate-limit.js', () => ({
  enforceUploadRateLimit: vi.fn(),
}))

vi.mock('../../api/_lib/import-validation.js', () => ({
  validateImportLocalRunInput: vi.fn(),
}))

vi.mock('../../api/_lib/import-hash-verify.js', () => ({
  verifyImportHashes: vi.fn(),
}))

vi.mock('../../api/_lib/import-score.js', () => ({
  scoreImportedRun: vi.fn(),
}))

vi.mock('../../api/_lib/report-store.js', () => ({
  insertReport: vi.fn(),
}))

vi.mock('../../api/_lib/report-links.js', () => ({
  buildReportLinks: vi.fn(),
}))

const loadServerEnvMock = vi.mocked(loadServerEnv)
const rateLimitMock = vi.mocked(enforceUploadRateLimit)
const validateMock = vi.mocked(validateImportLocalRunInput)
const verifyMock = vi.mocked(verifyImportHashes)
const scoreMock = vi.mocked(scoreImportedRun)
const insertMock = vi.mocked(insertReport)
const linksMock = vi.mocked(buildReportLinks)

const requestBody = {
  gladiator_name: 'ArenaWolf',
  github_username: 'hhchuan89',
  device_id: '123e4567-e89b-42d3-a456-426614174000',
  bbb_report: {
    test_suite_version: 'v1',
    run_hash: 'a'.repeat(64),
    replay_hash: 'b'.repeat(64),
    hardware: {
      tier: 'S',
      gpu: 'Apple M4',
      gpu_vendor: 'Apple',
      gpu_raw: 'ANGLE (Apple, Apple M4)',
      os_name: 'macOS',
      browser_name: 'Chrome',
      vram_gb: 16,
    },
    models_tested: [
      {
        model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        model_name: 'Llama',
        total_score: 72.3,
        phases: {
          logic_traps: {
            details: {
              scenario_id: 'quick-battle-30s',
              scenario_name: 'Quick Battle 30s',
            },
          },
        },
      },
    ],
  },
  bbb_raw_outputs: {
    raw_outputs: [
      { test_id: 'quick-001', run: 1, output: '{"answer":"B"}' },
      { test_id: 'quick-002', run: 2, output: '{"answer":"B"}' },
      { test_id: 'quick-003', run: 3, output: '{"answer":"C"}' },
    ],
  },
}

describe('/api/import-report', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    loadServerEnvMock.mockReturnValue({
      supabaseUrl: 'https://example.supabase.co',
      supabaseServiceRoleKey: 'test-key',
      appBaseUrl: 'https://browserbattlebench.vercel.app',
      uploadLimitPerWindow: 20,
      uploadWindowMinutes: 10,
      rateLimitSalt: '',
    })
    validateMock.mockReturnValue({
      ok: true,
      value: requestBody,
    })
    rateLimitMock.mockResolvedValue({
      allowed: true,
    })
    verifyMock.mockReturnValue({
      run_hash: requestBody.bbb_report.run_hash,
      replay_hash: requestBody.bbb_report.replay_hash,
      computed_run_hash: requestBody.bbb_report.run_hash,
      computed_replay_hash: requestBody.bbb_report.replay_hash,
    })
    scoreMock.mockReturnValue({
      score: {
        mode: 'quick',
        scenario_id: 'quick-battle-30s',
        scenario_name: 'Quick Battle 30s',
        score: 100,
        grade: 'S',
        pass_rate: 100,
        total_rounds: 3,
        passed_rounds: 3,
      },
      diagnostics: {
        expected_tests: 3,
        observed_outputs: 3,
        matched_outputs: 3,
        missing_test_ids: [],
        unknown_test_ids: [],
      },
    })
    insertMock.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      mode: 'quick',
      scenario_id: 'quick-battle-30s',
      scenario_name: 'Quick Battle 30s',
      model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      score: 100,
      grade: 'S',
      tier: 'S',
      gladiator_name: 'ArenaWolf',
      device_id: requestBody.device_id,
      ingest_source: 'import_local',
      integrity_status: 'hash_verified',
      report_summary: {},
      created_at: '2026-02-22T12:00:00.000Z',
    } as any)
    linksMock.mockReturnValue({
      id: '11111111-1111-4111-8111-111111111111',
      share_url: 'https://browserbattlebench.vercel.app/api/share?id=11111111-1111-4111-8111-111111111111',
      canonical_url: 'https://browserbattlebench.vercel.app/r/11111111-1111-4111-8111-111111111111',
      og_image_url: 'https://browserbattlebench.vercel.app/api/og?id=11111111-1111-4111-8111-111111111111',
    })
  })

  it('returns published links and persists import metadata', async () => {
    const response = (await handler({
      method: 'POST',
      url: '/api/import-report',
      headers: {
        host: 'browserbattlebench.vercel.app',
      },
      body: requestBody,
    })) as Response

    expect(response.status).toBe(200)
    const payload = (await response.json()) as Record<string, unknown>
    expect(payload.id).toBe('11111111-1111-4111-8111-111111111111')

    expect(insertMock).toHaveBeenCalledTimes(1)
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(insertPayload.ingest_source).toBe('import_local')
    expect(insertPayload.integrity_status).toBe('hash_verified')
    expect(insertPayload.run_hash).toBe(requestBody.bbb_report.run_hash)
    expect(insertPayload.replay_hash).toBe(requestBody.bbb_report.replay_hash)
  })

  it('returns 400 when hash verification fails', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('run_hash mismatch (possible tampering)')
    })

    const response = (await handler({
      method: 'POST',
      url: '/api/import-report',
      headers: { host: 'browserbattlebench.vercel.app' },
      body: requestBody,
    })) as Response

    expect(response.status).toBe(400)
    const payload = (await response.json()) as Record<string, unknown>
    expect(String(payload.error)).toContain('run_hash mismatch')
  })
})
