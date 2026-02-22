import { describe, expect, it } from 'vitest'
import {
  canTriggerActions,
  resolvePrimaryCtaLabel,
} from '@/lib/share/result-action-state'

describe('result-action-state', () => {
  it('resolves primary button labels by mode', () => {
    expect(resolvePrimaryCtaLabel('next')).toBe('Publish and Next Challenge')
    expect(resolvePrimaryCtaLabel('leaderboard')).toBe('Publish to Leaderboard')
    expect(resolvePrimaryCtaLabel('retry')).toBe('Retry')
  })

  it('prefers explicit override label', () => {
    expect(resolvePrimaryCtaLabel('next', 'Next: Leaderboard')).toBe('Next: Leaderboard')
  })

  it('blocks actions only while publishing', () => {
    expect(canTriggerActions('idle')).toBe(true)
    expect(canTriggerActions('publishing')).toBe(false)
    expect(canTriggerActions('published')).toBe(true)
    expect(canTriggerActions('shared')).toBe(true)
  })
})
