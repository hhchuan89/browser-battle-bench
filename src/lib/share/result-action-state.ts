import type { ShareBadgeText } from '@/types/share'

export type PublishUiState = 'idle' | 'publishing' | 'published' | 'shared'

export type ResultPrimaryMode = 'next' | 'leaderboard' | 'retry'

export const resolvePrimaryCtaLabel = (
  mode: ResultPrimaryMode,
  overrideLabel?: string
): string => {
  if (overrideLabel && overrideLabel.trim()) {
    return overrideLabel.trim()
  }

  if (mode === 'leaderboard') return 'Publish to Leaderboard'
  if (mode === 'retry') return 'Retry'
  return 'Publish and Next Challenge'
}

export const canTriggerActions = (state: PublishUiState): boolean =>
  state !== 'publishing'

export const shouldShowContributeTrapCta = (badgeText: ShareBadgeText): boolean =>
  badgeText === 'SURVIVED' || badgeText === 'WASTED'
