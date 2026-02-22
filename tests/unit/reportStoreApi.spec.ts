import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublishReportInput, StoredReportRow } from '../../api/_lib/contracts.js'
import { insertReport } from '../../api/_lib/report-store.js'
import { SupabaseRestError, supabaseRest } from '../../api/_lib/supabase.js'

vi.mock('../../api/_lib/supabase.js', () => {
  class MockSupabaseRestError extends Error {
    status: number
    payload?: unknown

    constructor(status: number, message: string, payload?: unknown) {
      super(message)
      this.name = 'SupabaseRestError'
      this.status = status
      this.payload = payload
    }
  }

  return {
    SupabaseRestError: MockSupabaseRestError,
    supabaseRest: vi.fn(),
  }
})

const supabaseRestMock = vi.mocked(supabaseRest)

const basePayload: PublishReportInput = {
  mode: 'quick',
  scenario_id: 'quick-001',
  scenario_name: 'Quick Battle 30s',
  model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  score: 90.5,
  grade: 'A',
  tier: 'S',
  pass_rate: 90,
  total_rounds: 10,
  passed_rounds: 9,
  run_hash: 'run-hash-001',
  replay_hash: 'replay-hash-001',
  source_run_ref: 'quick-run-001',
  gladiator_name: 'ArenaChampion',
  github_username: 'hhchuan89',
  device_id: '123e4567-e89b-42d3-a456-426614174000',
  canonical_model_id: 'fake-client-value',
  model_family: 'fake-family',
  param_size: '999B',
  quantization: 'fake-quant',
  gpu_name: 'Apple M4',
  gpu_vendor: 'Apple',
  gpu_raw: 'ANGLE (Apple, Apple M4, OpenGL 4.1)',
  os_name: 'macOS',
  browser_name: 'Chrome',
  vram_gb: 16,
  report_summary: {
    mode: 'quick',
  },
}

const makeRow = (overrides: Partial<StoredReportRow> = {}): StoredReportRow => ({
  id: '11111111-1111-4111-8111-111111111111',
  mode: 'quick',
  scenario_id: 'quick-001',
  scenario_name: 'Quick Battle 30s',
  model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  score: 90.5,
  grade: 'A',
  tier: 'S',
  pass_rate: 90,
  total_rounds: 10,
  passed_rounds: 9,
  run_hash: 'run-hash-001',
  replay_hash: 'replay-hash-001',
  source_run_ref: 'quick-run-001',
  gladiator_name: 'ArenaChampion',
  github_username: 'hhchuan89',
  device_id: '123e4567-e89b-42d3-a456-426614174000',
  canonical_model_id: 'llama-3.2-1b-q4f16',
  model_family: 'llama-3.2',
  param_size: '1B',
  quantization: 'q4f16',
  gpu_name: 'Apple M4',
  gpu_vendor: 'Apple',
  gpu_raw: 'ANGLE (Apple, Apple M4, OpenGL 4.1)',
  os_name: 'macOS',
  browser_name: 'Chrome',
  vram_gb: 16,
  report_summary: { mode: 'quick' },
  created_at: '2026-02-22T12:00:00.000Z',
  ...overrides,
})

describe('api report-store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns existing record when run_hash already exists', async () => {
    supabaseRestMock.mockResolvedValueOnce({
      data: [makeRow()],
      headers: new Headers(),
    })

    const result = await insertReport(basePayload)
    expect(result.id).toBe('11111111-1111-4111-8111-111111111111')
    expect(supabaseRestMock).toHaveBeenCalledTimes(1)
    expect(String(supabaseRestMock.mock.calls[0][0])).toContain('run_hash=eq.run-hash-001')
  })

  it('returns existing arena record when mode+source_run_ref already exists', async () => {
    supabaseRestMock.mockResolvedValueOnce({
      data: [makeRow({ mode: 'arena', run_hash: null })],
      headers: new Headers(),
    })

    const result = await insertReport({
      ...basePayload,
      mode: 'arena',
      run_hash: null,
      source_run_ref: 'arena-run-001',
    })

    expect(result.mode).toBe('arena')
    expect(supabaseRestMock).toHaveBeenCalledTimes(1)
    expect(String(supabaseRestMock.mock.calls[0][0])).toContain('mode=eq.arena')
    expect(String(supabaseRestMock.mock.calls[0][0])).toContain('source_run_ref=eq.arena-run-001')
  })

  it('falls back to schema-compatible insert when full insert hits schema drift', async () => {
    supabaseRestMock
      .mockResolvedValueOnce({
        data: [],
        headers: new Headers(),
      })
      .mockRejectedValueOnce(
        new SupabaseRestError(400, 'column does not exist', {
          message: 'column "device_id" does not exist',
        })
      )
      .mockResolvedValueOnce({
        data: [
          makeRow({
            gladiator_name: null,
            github_username: null,
            device_id: null,
            canonical_model_id: null,
          }),
        ],
        headers: new Headers(),
      })

    const result = await insertReport(basePayload)

    expect(result.id).toBe('11111111-1111-4111-8111-111111111111')
    expect(supabaseRestMock).toHaveBeenCalledTimes(3)

    const fullInsertBody = supabaseRestMock.mock.calls[1][1]?.body as Record<string, unknown>
    expect(fullInsertBody.canonical_model_id).toBe('llama-3.2-1b-q4f16')

    const fallbackBody = supabaseRestMock.mock.calls[2][1]?.body as Record<string, unknown>
    const fallbackSummary = fallbackBody.report_summary as Record<string, unknown>
    expect(fallbackSummary.mode).toBe('quick')
    expect((fallbackSummary._bbb_publish_meta as Record<string, unknown>)?.identity).toBeTruthy()
  })
})
