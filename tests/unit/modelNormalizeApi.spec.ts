import { describe, expect, it } from 'vitest'
import { normalizeModelId } from '../../api/_lib/model-normalize.js'

describe('api model normalization', () => {
  it('normalizes known model ids', () => {
    expect(normalizeModelId('Llama-3.2-3B-Instruct-q4f16_1-MLC')).toEqual({
      canonical_model_id: 'llama-3.2-3b-q4f16',
      model_family: 'llama-3.2',
      param_size: '3B',
      quantization: 'q4f16',
    })
  })

  it('derives fallback metadata for unknown ids', () => {
    const normalized = normalizeModelId('Mistral-7B-Instruct-v0.3-q4f16')
    expect(normalized.canonical_model_id).toContain('mistral')
    expect(normalized.param_size).toBe('7B')
    expect(normalized.quantization).toBe('q4f16')
  })
})
