import { describe, expect, it } from 'vitest'
import { buildArenaSharePayload } from '@/lib/share/share-payload'

describe('arena share payload', () => {
  it('builds payload with next route and challenge url', () => {
    const payload = buildArenaSharePayload({
      scenarioId: 'schema-easy-1',
      scenarioName: 'Easy Schema',
      modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      runRef: 'arena-123',
      hardwareLabel: 'GPU: Apple M4',
      origin: 'https://browserbattlebench.vercel.app',
      breakdown: {
        formatCompliance: 90,
        fieldCompleteness: 80,
        responseEfficiency: 70,
      },
    })

    expect(payload.nextRoute).toBe('/quick')
    expect(payload.challengeUrl).toContain('/arena?')
    expect(payload.challengeUrl).toContain('challenge=1')
    expect(payload.challengeUrl).toContain('scenario=schema-easy-1')
    expect(payload.challengeUrl).toContain('model=Llama-3.2-1B-Instruct-q4f16_1-MLC')
    expect(payload.challengeUrl).toContain('run=arena-123')
    expect(payload.hardwareLabel).toBe('GPU: Apple M4')
    expect(payload.grade).toBe('A')
  })

  it('uses fallback defaults when optional values are omitted', () => {
    const payload = buildArenaSharePayload({
      scenarioId: 'schema-easy-2',
      scenarioName: 'Fallback Arena',
      modelId: 'unknown-model',
      breakdown: {
        formatCompliance: 20,
        fieldCompleteness: 30,
        responseEfficiency: 40,
      },
    })

    expect(payload.runRef).toBeNull()
    expect(payload.hardwareLabel).toBe('GPU: Unknown')
    expect(payload.grade).toBe('F')
    expect(payload.badgeText).toBe('WASTED')
  })
})
