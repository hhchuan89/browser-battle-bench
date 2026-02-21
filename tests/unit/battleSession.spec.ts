import { describe, expect, it } from 'vitest'
import {
  isScenarioCompatibleForArenaView,
  resolveScenarioMode,
} from '@/lib/battle-session'

describe('battle-session mode scoping', () => {
  it('defaults missing runMode to gauntlet', () => {
    expect(resolveScenarioMode({ id: 's1' })).toBe('gauntlet')
  })

  it('accepts empty scenario as compatible', () => {
    expect(isScenarioCompatibleForArenaView(null, 'quick', ['quick-1'])).toBe(true)
  })

  it('rejects scenario not present in current arena catalog', () => {
    expect(
      isScenarioCompatibleForArenaView(
        { id: 'quick-1', runMode: 'quick' },
        'gauntlet',
        ['gauntlet-1', 'gauntlet-2']
      )
    ).toBe(false)
  })

  it('rejects cross-mode scenario reuse', () => {
    expect(
      isScenarioCompatibleForArenaView(
        { id: 'quick-1', runMode: 'quick' },
        'gauntlet',
        ['quick-1']
      )
    ).toBe(false)
  })

  it('accepts matching mode and scenario list', () => {
    expect(
      isScenarioCompatibleForArenaView(
        { id: 'quick-1', runMode: 'quick' },
        'quick',
        ['quick-1']
      )
    ).toBe(true)
  })
})
