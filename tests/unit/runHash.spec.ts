import { describe, expect, it } from 'vitest'
import {
  createRunHashMaterial,
  generateRunHash,
  generateRunHashFromRawOutputs,
  serializeRunHashMaterial,
} from '@/lib/run-hash'

describe('run-hash', () => {
  it('creates deterministic material ordering', () => {
    const material = createRunHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        { test_id: 'b_case', run: 2, output: 'out-2' },
        { test_id: 'a_case', run: 1, output: 'out-1' },
        { test_id: 'b_case', run: 1, output: 'out-0' },
      ],
    })

    expect(material.test_case_ids).toEqual(['a_case', 'b_case'])
    expect(material.raw_outputs.map((entry) => `${entry.test_id}:${entry.run}`)).toEqual([
      'a_case:1',
      'b_case:1',
      'b_case:2',
    ])
  })

  it('generates stable hash for equivalent payload regardless of raw order', async () => {
    const a = await generateRunHashFromRawOutputs({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        { test_id: 'case_2', run: 2, output: 'B' },
        { test_id: 'case_1', run: 1, output: 'A' },
      ],
    })

    const b = await generateRunHashFromRawOutputs({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [
        { test_id: 'case_1', run: 1, output: 'A' },
        { test_id: 'case_2', run: 2, output: 'B' },
      ],
    })

    expect(a.runHash).toBe(b.runHash)
  })

  it('changes hash when test suite version changes', async () => {
    const materialV1 = createRunHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [{ test_id: 'case_1', run: 1, output: 'A' }],
    })
    const materialV2 = createRunHashMaterial({
      testSuiteVersion: '1.1.0',
      modelId: 'model-a',
      rawOutputs: [{ test_id: 'case_1', run: 1, output: 'A' }],
    })

    const hashV1 = await generateRunHash(materialV1)
    const hashV2 = await generateRunHash(materialV2)

    expect(hashV1).not.toBe(hashV2)
  })

  it('serializes material to JSON string', () => {
    const material = createRunHashMaterial({
      testSuiteVersion: '1.0.0',
      modelId: 'model-a',
      rawOutputs: [{ test_id: 'case_1', run: 1, output: 'A' }],
    })

    const serialized = serializeRunHashMaterial(material)
    expect(typeof serialized).toBe('string')
    expect(() => JSON.parse(serialized)).not.toThrow()
  })
})
