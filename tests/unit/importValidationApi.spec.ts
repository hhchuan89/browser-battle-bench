import { describe, expect, it } from 'vitest'
import { validateImportLocalRunInput } from '../../api/_lib/import-validation.js'

const basePayload = {
  gladiator_name: 'ArenaWolf',
  github_username: '@hhchuan89',
  device_id: '123e4567-e89b-42d3-a456-426614174000',
  bbb_report: {
    test_suite_version: 'v1',
    run_hash: 'a'.repeat(64),
    replay_hash: 'b'.repeat(64),
    models_tested: [
      {
        model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
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
      {
        test_id: 'quick-001',
        run: 1,
        output: '{"answer":"B"}',
        ttft_ms: 123,
        total_time_ms: 456,
        char_timestamps: [1, 2, 3],
      },
    ],
  },
}

describe('api import validation', () => {
  it('accepts valid payload and normalizes github username + hash casing', () => {
    const result = validateImportLocalRunInput({
      ...basePayload,
      bbb_report: {
        ...basePayload.bbb_report,
        run_hash: 'A'.repeat(64),
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.github_username).toBe('hhchuan89')
    expect(result.value.bbb_report.run_hash).toBe('a'.repeat(64))
  })

  it('rejects missing dual-file input', () => {
    const result = validateImportLocalRunInput({
      ...basePayload,
      bbb_raw_outputs: undefined,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('bbb_raw_outputs')
  })

  it('rejects invalid device_id', () => {
    const result = validateImportLocalRunInput({
      ...basePayload,
      device_id: 'not-a-uuid',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('device_id')
  })

  it('rejects raw_outputs beyond max limit', () => {
    const result = validateImportLocalRunInput(basePayload, {
      maxRawOutputs: 0,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('max entries')
  })
})
