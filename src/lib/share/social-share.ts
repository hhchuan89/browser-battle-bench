import type { ShareResultPayload } from '@/types/share'

export type SocialPlatform =
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'telegram'
  | 'whatsapp'

export interface SocialShareTarget {
  id: SocialPlatform
  label: string
  icon: string
  url: string
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

  return [
    {
      id: 'x',
      label: 'X',
      icon: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: 'f',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: 'in',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      id: 'reddit',
      label: 'Reddit',
      icon: 'r/',
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: 'tg',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: 'wa',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
  ]
}
