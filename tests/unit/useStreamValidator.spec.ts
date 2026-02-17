import { describe, expect, it } from 'vitest'
import { useStreamValidator } from '@/composables/useStreamValidator'

describe('useStreamValidator', () => {
  it('detects the opening brace once the buffer is full', () => {
    const validator = useStreamValidator({ whitespaceBufferSize: 1 })
    const result = validator.validateStream(' {')

    expect(result.whitespaceBufferFull).toBe(true)
    expect(result.startsWithBrace).toBe(true)
    expect(result.isValid).toBe(true)
    expect(result.shouldGuillotine).toBe(false)
  })

  it('guillotines when a natural-language prefix appears after the buffer', () => {
    const validator = useStreamValidator({ whitespaceBufferSize: 1 })
    const result = validator.validateStream('Sure, here is the answer')

    expect(result.detectedPrefixes).toContain('sure,')
    expect(result.shouldGuillotine).toBe(true)
    expect(result.isValid).toBe(false)
  })

  it('guillotines when a code block marker is detected', () => {
    const validator = useStreamValidator({ whitespaceBufferSize: 1 })
    const result = validator.validateStream('```json')

    expect(result.hasCodeBlock).toBe(true)
    expect(result.shouldGuillotine).toBe(true)
  })

  it('records timestamps every 50 characters', () => {
    const validator = useStreamValidator({ whitespaceBufferSize: 1 })
    const result = validator.validateStream('a'.repeat(51))

    expect(result.charTimestamps).toHaveLength(2)
    expect(result.charTimestamps[0].index).toBe(0)
    expect(result.charTimestamps[1].index).toBe(50)
  })
})
