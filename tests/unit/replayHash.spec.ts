import { describe, expect, it } from 'vitest'
import {
  createReplayHashMaterial,
  generateReplayHash,
  generateReplayHashFromRawOutputs,
  serializeReplayHashMaterial,
} from '@/lib/replay-hash'

describe('replay-hash', () => {
  it('creates deterministic timing material ordering', () => {
    const material = createReplayHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'b_case',
          run: 2,
          ttft_ms: 12,
          total_time_ms: 100,
          char_timestamps: [0, 50],
        },
        {
          test_id: 'a_case',
          run: 1,
          ttft_ms: 8,
          total_time_ms: 80,
          char_timestamps: [0],
        },
        {
          test_id: 'b_case',
          run: 1,
          ttft_ms: 10,
          total_time_ms: 95,
          char_timestamps: [0, 50, 100],
        },
      ],
    })

    expect(material.timing_outputs.map((entry) => `${entry.test_id}:${entry.run}`)).toEqual([
      'a_case:1',
      'b_case:1',
      'b_case:2',
    ])
  })

  it('generates stable hash for equivalent payload regardless of raw order', async () => {
    const a = await generateReplayHashFromRawOutputs({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'case_2',
          run: 2,
          ttft_ms: 20,
          total_time_ms: 120,
          char_timestamps: [0, 50],
        },
        {
          test_id: 'case_1',
          run: 1,
          ttft_ms: 10,
          total_time_ms: 100,
          char_timestamps: [0],
        },
      ],
    })

    const b = await generateReplayHashFromRawOutputs({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'case_1',
          run: 1,
          ttft_ms: 10,
          total_time_ms: 100,
          char_timestamps: [0],
        },
        {
          test_id: 'case_2',
          run: 2,
          ttft_ms: 20,
          total_time_ms: 120,
          char_timestamps: [0, 50],
        },
      ],
    })

    expect(a.replayHash).toBe(b.replayHash)
  })

  it('changes hash when test suite version changes', async () => {
    const materialV1 = createReplayHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'case_1',
          run: 1,
          ttft_ms: 8,
          total_time_ms: 80,
          char_timestamps: [0],
        },
      ],
    })
    const materialV2 = createReplayHashMaterial({
      testSuiteVersion: '1.1.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'case_1',
          run: 1,
          ttft_ms: 8,
          total_time_ms: 80,
          char_timestamps: [0],
        },
      ],
    })

    const hashV1 = await generateReplayHash(materialV1)
    const hashV2 = await generateReplayHash(materialV2)

    expect(hashV1).not.toBe(hashV2)
  })

  it('serializes material to JSON string', () => {
    const material = createReplayHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        {
          test_id: 'case_1',
          run: 1,
          ttft_ms: 8,
          total_time_ms: 80,
          char_timestamps: [0],
        },
      ],
    })

    const serialized = serializeReplayHashMaterial(material)
    expect(typeof serialized).toBe('string')
    expect(() => JSON.parse(serialized)).not.toThrow()
  })
})
