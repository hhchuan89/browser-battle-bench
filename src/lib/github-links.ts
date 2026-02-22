const REPO_BASE_URL = 'https://github.com/hhchuan89/browser-battle-bench'

const withUtm = (url: string, medium: string, campaign: string): string => {
  const target = new URL(url)
  target.searchParams.set('utm_source', 'bbb_app')
  target.searchParams.set('utm_medium', medium)
  target.searchParams.set('utm_campaign', campaign)
  return target.toString()
}

export const GITHUB_REPO_URL = REPO_BASE_URL

export const GITHUB_STAR_URL = withUtm(
  REPO_BASE_URL,
  'navbar_star',
  'day0_launch'
)

export const GITHUB_CONTRIBUTING_URL = withUtm(
  `${REPO_BASE_URL}/blob/main/CONTRIBUTING.md`,
  'result_cta',
  'day0_launch'
)

export const GITHUB_ISSUE_TORTURE_TEST_URL = withUtm(
  `${REPO_BASE_URL}/issues/new?template=torture-test.yml&labels=torture-test&title=%5BTorture%20Test%5D%20`,
  'result_cta',
  'day0_launch'
)
