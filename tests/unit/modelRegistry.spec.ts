import { describe, expect, it } from 'vitest'
import { canonicalizeModelId } from '@/data/model-registry'

describe('model-registry canonicalization', () => {
  it('normalizes known model ids to stable canonical metadata', () => {
    const normalized = canonicalizeModelId('Llama-3.2-1B-Instruct-q4f16_1-MLC')
    expect(normalized).toEqual({
      canonical_model_id: 'llama-3.2-1b-q4f16',
      model_family: 'llama-3.2',
      param_size: '1B',
      quantization: 'q4f16',
    })
  })

  it('derives fallback metadata for unknown model ids', () => {
    const normalized = canonicalizeModelId('Qwen2.5-7B-Instruct-q8_0-MLC')
    expect(normalized.canonical_model_id).toContain('qwen2.5')
    expect(normalized.model_family).toBe('unknown')
    expect(normalized.param_size).toBe('7B')
    expect(normalized.quantization).toBe('q8')
  })
})
