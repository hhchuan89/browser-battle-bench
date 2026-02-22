const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const encodePathSegment = (value: string): string =>
  encodeURIComponent(value).replace(/%2F/g, '_')

export interface ReportLinks {
  id: string
  share_url: string
  canonical_url: string
  og_image_url: string
}

export const buildReportLinks = (baseUrl: string, id: string): ReportLinks => {
  const base = trimTrailingSlash(baseUrl)
  const token = encodePathSegment(id)
  return {
    id,
    share_url: `${base}/api/share?id=${token}`,
    canonical_url: `${base}/r/${token}`,
    og_image_url: `${base}/api/og?id=${token}`,
  }
}
