import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { useScorer } from '@/composables/useScorer'
import type { StreamValidationResult } from '@/composables/useStreamValidator'

const baseValidation = (
  overrides: Partial<StreamValidationResult> = {}
): StreamValidationResult => ({
  isValid: true,
  shouldGuillotine: false,
  detectedPrefixes: [],
  hasCodeBlock: false,
  startsWithBrace: true,
  whitespaceBufferFull: true,
  yapRate: 0,
  charTimestamps: [],
  ...overrides,
})

const simpleSchema = z.object({
  foo: z.string(),
  bar: z.number().optional(),
})

describe('useScorer', () => {
  it('applies format compliance penalties and emits errors/warnings', () => {
    const scorer = useScorer()
    const validation = baseValidation({
      startsWithBrace: false,
      hasCodeBlock: true,
      detectedPrefixes: ['sure,'],
      yapRate: 10,
    })

    const result = scorer.calculateScore(
      validation,
      JSON.stringify({ foo: 'ok' }),
      simpleSchema,
      1000
    )

    expect(result.breakdown.formatCompliance).toBe(0)
    expect(result.breakdown.responseEfficiency).toBe(90)
    expect(result.breakdown.ttft).toBe(90)
    expect(result.errors).toContain('Response does not start with opening brace {')
    expect(result.errors).toContain('Response contains code block markers')
    expect(result.warnings[0]).toContain('Detected language prefixes: sure,')
    expect(result.totalScore).toBeCloseTo(62, 2)
  })

  it('scores field completeness based on required fields', () => {
    const scorer = useScorer()
    const result = scorer.calculateScore(
      baseValidation(),
      JSON.stringify({ bar: 1 }),
      simpleSchema,
      0
    )

    expect(result.breakdown.fieldCompleteness).toBe(0)
  })

  it('penalizes schema purity for extra fields', () => {
    const scorer = useScorer()
    const result = scorer.calculateScore(
      baseValidation(),
      JSON.stringify({ foo: 'ok', extra: true }),
      simpleSchema,
      0
    )

    expect(result.breakdown.schemaPurity).toBe(75)
  })

  it('honors setWeights overrides', () => {
    const scorer = useScorer()
    scorer.setWeights({
      formatCompliance: 100,
      fieldCompleteness: 0,
      responseEfficiency: 0,
      schemaPurity: 0,
      ttft: 0,
    })

    const result = scorer.calculateScore(
      baseValidation({ startsWithBrace: false }),
      JSON.stringify({ foo: 'ok' }),
      simpleSchema,
      0
    )

    expect(result.breakdown.formatCompliance).toBe(50)
    expect(result.totalScore).toBe(50)
  })
})
