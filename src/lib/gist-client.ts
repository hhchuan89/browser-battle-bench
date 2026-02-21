import type { BBBReportBundle, BBBReportJson } from '@/types/report'

export interface GistFilePayload {
  content: string
}

export interface GistCreatePayload {
  description?: string
  public?: boolean
  files: Record<string, GistFilePayload>
}

export interface GistResponse {
  id: string
  html_url: string
  files: Record<string, { filename: string; raw_url: string }>
}

export interface GistReportSummary {
  gistId: string
  report: BBBReportJson
}

const GIST_API = 'https://api.github.com/gists'

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON response: ${text}`)
  }
}

export const createReportGist = async (
  token: string,
  bundle: BBBReportBundle,
  description = 'Browser Battle Bench Report',
  isPublic = false
): Promise<GistResponse> => {
  const payload: GistCreatePayload = {
    description,
    public: isPublic,
    files: {
      'report.json': { content: JSON.stringify(bundle.report, null, 2) },
      'raw_outputs.json': { content: JSON.stringify(bundle.rawOutputs, null, 2) },
    },
  }

  const response = await fetch(GIST_API, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Gist create failed (${response.status})`)
  }

  return parseJson<GistResponse>(response)
}

export const updateReportGist = async (
  token: string,
  gistId: string,
  bundle: BBBReportBundle,
  description = 'Browser Battle Bench Report'
): Promise<GistResponse> => {
  const payload: GistCreatePayload = {
    description,
    files: {
      'report.json': { content: JSON.stringify(bundle.report, null, 2) },
      'raw_outputs.json': { content: JSON.stringify(bundle.rawOutputs, null, 2) },
    },
  }

  const response = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Gist update failed (${response.status})`)
  }

  return parseJson<GistResponse>(response)
}

export const createOrUpdateReportGist = async (
  token: string,
  bundle: BBBReportBundle,
  gistId?: string,
  description?: string,
  isPublic = false
): Promise<GistResponse> => {
  if (gistId) {
    return updateReportGist(token, gistId, bundle, description)
  }
  return createReportGist(token, bundle, description, isPublic)
}

export const fetchGistReport = async (
  gistId: string,
  token?: string
): Promise<GistReportSummary | null> => {
  const response = await fetch(`${GIST_API}/${gistId}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Gist fetch failed (${response.status})`)
  }

  const payload = await parseJson<GistResponse & { files: Record<string, any> }>(response)
  const reportFile = payload.files?.['report.json']
  if (!reportFile?.raw_url) return null

  const reportResponse = await fetch(reportFile.raw_url)
  if (!reportResponse.ok) {
    throw new Error(`Report fetch failed (${reportResponse.status})`)
  }
  const report = await parseJson<BBBReportJson>(reportResponse)
  return {
    gistId,
    report,
  }
}
