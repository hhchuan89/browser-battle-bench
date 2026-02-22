import type { ShareResultPayload } from '@/types/share'

export type SocialPlatform =
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'threads'
  | 'bluesky'

export interface SocialShareTarget {
  id: SocialPlatform
  label: string
  icon: string
  url: string
  prefillSupported: boolean
  composeText: string
}

const modeLabel = (mode: ShareResultPayload['mode']): string => {
  switch (mode) {
    case 'arena':
      return 'Arena'
    case 'quick':
      return 'Quick'
    case 'gauntlet':
      return 'Gauntlet'
    case 'stress':
      return 'Stress'
    case 'history':
      return 'History'
    default:
      return 'Battle'
  }
}

export const buildSocialShareText = (payload: ShareResultPayload): string =>
  `BBB ${modeLabel(payload.mode)} | ${payload.badgeText} ${payload.grade} in ${payload.scenarioName}. Can you beat this run?`

export const buildSocialShareTargets = (
  payload: ShareResultPayload,
  shareUrlOverride?: string
): SocialShareTarget[] => {
  const shareText = buildSocialShareText(payload)
  const shareUrl =
    (shareUrlOverride && shareUrlOverride.trim()) ||
    payload.shareUrl ||
    payload.challengeUrl
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(shareUrl)
  const composedMessage = `${shareText} ${shareUrl}`.trim()

  return [
    {
      id: 'x',
      label: 'X',
      icon: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: 'in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: 'r/',
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: '@',
      url: `https://www.threads.net/intent/post?text=${encodeURIComponent(composedMessage)}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
    {
      id: 'bluesky',
      label: 'Bluesky',
      icon: 'bs',
      url: `https://bsky.app/intent/compose?text=${encodeURIComponent(composedMessage)}`,
      prefillSupported: true,
      composeText: composedMessage,
    },
  ]
}
