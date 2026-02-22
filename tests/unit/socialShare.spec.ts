import { describe, expect, it } from 'vitest'
import {
  buildSocialShareTargets,
  buildSocialShareText,
} from '@/lib/share/social-share'
import type { ShareResultPayload } from '@/types/share'

const payload: ShareResultPayload = {
  mode: 'quick',
  scenarioId: 'quick-battle-30s',
  scenarioName: 'Quick Battle 30s',
  modelId: 'TestModel',
  grade: 'A',
  badgeText: 'GLADIATOR',
  scores: {
    obedience: 90,
    intelligence: 84,
    stability: 79,
  },
  hardwareLabel: 'GPU: Test',
  taunt: 'You call that fast?',
  runRef: 'run-1',
  shareUrl: 'https://browserbattlebench.vercel.app/quick?challenge=1',
  challengeUrl: 'https://browserbattlebench.vercel.app/quick?challenge=1',
  nextRoute: '/gauntlet',
}

describe('social share builder', () => {
  it('builds a readable share text', () => {
    const text = buildSocialShareText(payload)
    expect(text).toContain('BBB Quick')
    expect(text).toContain('GLADIATOR A')
  })

  it('builds expected platform targets', () => {
    const targets = buildSocialShareTargets(
      payload,
      'https://browserbattlebench.vercel.app/api/share/abc'
    )
    expect(targets).toHaveLength(6)
    expect(targets.map((target) => target.id)).toEqual([
      'x',
      'facebook',
      'linkedin',
      'reddit',
      'threads',
      'bluesky',
    ])
    expect(targets[0].url).toContain('twitter.com/intent/tweet')
    expect(targets[0].url).toContain(encodeURIComponent('/api/share/abc'))
    expect(targets[1].url).toContain('facebook.com/sharer')
    expect(targets[2].url).toContain('linkedin.com/sharing/share-offsite')
    expect(targets[4].url).toContain('threads.net/intent/post')
    expect(targets[5].url).toContain('bsky.app/intent/compose')
    expect(targets[5].prefillSupported).toBe(true)
  })
})
