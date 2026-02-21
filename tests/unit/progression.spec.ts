import { describe, expect, it } from 'vitest'
import { getNextRoute, getNextStage } from '@/lib/progression'

describe('progression routing', () => {
  it('maps the default sequence correctly', () => {
    expect(getNextStage('arena')).toBe('quick')
    expect(getNextStage('quick')).toBe('gauntlet')
    expect(getNextStage('gauntlet')).toBe('stress')
    expect(getNextStage('stress')).toBe('leaderboard')
    expect(getNextStage('leaderboard')).toBe('leaderboard')
  })

  it('skips stress when blocked on gauntlet completion', () => {
    expect(getNextStage('gauntlet', { stressBlocked: true })).toBe('leaderboard')
    expect(getNextRoute('gauntlet', { stressBlocked: true })).toBe('/leaderboard')
  })

  it('returns path routes for each stage', () => {
    expect(getNextRoute('arena')).toBe('/quick')
    expect(getNextRoute('quick')).toBe('/gauntlet')
    expect(getNextRoute('gauntlet')).toBe('/stress')
    expect(getNextRoute('stress')).toBe('/leaderboard')
  })
})

