import { describe, expect, it } from 'vitest'
import { useYapometer } from '@/composables/useYapometer'

describe('useYapometer', () => {
  it('reports zero yap rate for pure JSON', () => {
    const { calculateYapRate, calculateYapMetrics } = useYapometer()
    const text = '{"ok":true}'

    expect(calculateYapRate(text)).toBe(0)
    expect(calculateYapMetrics(text).yapChars).toBe(0)
  })

  it('reports non-zero yap rate for mixed output', () => {
    const { calculateYapRate } = useYapometer()
    const text = 'Sure! {"ok":true} Thanks!'

    expect(calculateYapRate(text)).toBeGreaterThan(0)
  })

  it('treats missing JSON braces as full yap', () => {
    const { calculateYapMetrics } = useYapometer()
    const text = 'no json here'
    const metrics = calculateYapMetrics(text)

    expect(metrics.jsonSpanLength).toBe(0)
    expect(metrics.yapChars).toBe(text.length)
    expect(metrics.yapRate).toBe(100)
  })
})
