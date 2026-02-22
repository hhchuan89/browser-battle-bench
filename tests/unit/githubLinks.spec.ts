import { describe, expect, it } from 'vitest'
import {
  GITHUB_CONTRIBUTING_URL,
  GITHUB_ISSUE_TORTURE_TEST_URL,
  GITHUB_REPO_URL,
  GITHUB_STAR_URL,
} from '@/lib/github-links'

describe('github-links', () => {
  it('exposes the canonical repository URL', () => {
    expect(GITHUB_REPO_URL).toBe('https://github.com/hhchuan89/browser-battle-bench')
  })

  it('builds a star URL with launch tracking params', () => {
    const target = new URL(GITHUB_STAR_URL)
    expect(`${target.origin}${target.pathname}`).toBe(GITHUB_REPO_URL)
    expect(target.searchParams.get('utm_source')).toBe('bbb_app')
    expect(target.searchParams.get('utm_medium')).toBe('navbar_star')
    expect(target.searchParams.get('utm_campaign')).toBe('day0_launch')
  })

  it('builds a contributing URL with launch tracking params', () => {
    const target = new URL(GITHUB_CONTRIBUTING_URL)
    expect(target.pathname).toBe('/hhchuan89/browser-battle-bench/blob/main/CONTRIBUTING.md')
    expect(target.searchParams.get('utm_source')).toBe('bbb_app')
    expect(target.searchParams.get('utm_medium')).toBe('result_cta')
    expect(target.searchParams.get('utm_campaign')).toBe('day0_launch')
  })

  it('builds an issue link for torture test template and labels', () => {
    const target = new URL(GITHUB_ISSUE_TORTURE_TEST_URL)
    expect(target.pathname).toBe('/hhchuan89/browser-battle-bench/issues/new')
    expect(target.searchParams.get('template')).toBe('torture-test.yml')
    expect(target.searchParams.get('labels')).toBe('torture-test')
    expect(target.searchParams.get('title')).toContain('[Torture Test]')
    expect(target.searchParams.get('utm_source')).toBe('bbb_app')
    expect(target.searchParams.get('utm_medium')).toBe('result_cta')
    expect(target.searchParams.get('utm_campaign')).toBe('day0_launch')
  })
})
