import type {
  GlobalLeaderboardResponse,
  PublicReportResponse,
  PublishMode,
  PublishReportRequest,
  PublishedShareLinks,
} from '@/lib/share/publish-types'

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response (${response.status}): ${text}`)
  }
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await parseJson<{ error?: string }>(response)
    if (payload.error) return payload.error
  } catch {
    // ignore JSON parse issues and fallback below
  }
  return `Request failed (${response.status})`
}

export const publishReport = async (
  request: PublishReportRequest
): Promise<PublishedShareLinks> => {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return parseJson<PublishedShareLinks>(response)
}

export const fetchPublicReport = async (
  id: string
): Promise<PublicReportResponse> => {
  const response = await fetch(`/api/report/${encodeURIComponent(id)}`)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return parseJson<PublicReportResponse>(response)
}

export const fetchGlobalLeaderboard = async (options?: {
  mode?: PublishMode | 'all'
  limit?: number
}): Promise<GlobalLeaderboardResponse> => {
  const params = new URLSearchParams()
  if (options?.mode && options.mode !== 'all') {
    params.set('mode', options.mode)
  }
  if (typeof options?.limit === 'number') {
    params.set('limit', String(options.limit))
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`/api/leaderboard/global${suffix}`)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return parseJson<GlobalLeaderboardResponse>(response)
}
