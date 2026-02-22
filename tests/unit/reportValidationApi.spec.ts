import { describe, expect, it } from 'vitest'
import { validatePublishReportInput } from '../../api/_lib/report-validation.js'

const validPayload = {
  mode: 'quick',
  scenario_id: 'quick-001',
  scenario_name: 'Quick Battle 30s',
  model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  score: 91.2,
  grade: 'A',
  tier: 'S',
  pass_rate: 90,
  total_rounds: 10,
  passed_rounds: 9,
  run_hash: 'run-hash-001',
  replay_hash: 'replay-hash-001',
  source_run_ref: 'quick-001-run',
  gladiator_name: 'ArenaChampion',
  github_username: '@hhchuan89',
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
  report_summary: {
    mode: 'quick',
  },
}

describe('api report validation', () => {
  it('accepts a valid payload and normalizes github username', () => {
    const result = validatePublishReportInput(validPayload)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.gladiator_name).toBe('ArenaChampion')
    expect(result.value.github_username).toBe('hhchuan89')
    expect(result.value.device_id).toBe('123e4567-e89b-42d3-a456-426614174000')
  })

  it('rejects missing gladiator_name', () => {
    const result = validatePublishReportInput({
      ...validPayload,
      gladiator_name: ' ',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('gladiator_name')
  })

  it('rejects invalid github username format', () => {
    const result = validatePublishReportInput({
      ...validPayload,
      github_username: 'bad user!',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('github_username')
  })

  it('rejects invalid device_id', () => {
    const result = validatePublishReportInput({
      ...validPayload,
      device_id: 'not-a-uuid',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('device_id')
  })

  it('rejects out-of-range vram_gb', () => {
    const result = validatePublishReportInput({
      ...validPayload,
      vram_gb: 2048,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('vram_gb')
  })
})
