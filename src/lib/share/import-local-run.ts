import type {
  ImportLocalRunRequest,
  ImportLocalRunResponse,
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
    // ignore and fallback below
  }
  return `Request failed (${response.status})`
}

export const importLocalRun = async (
  request: ImportLocalRunRequest
): Promise<ImportLocalRunResponse> => {
  const response = await fetch('/api/import-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return parseJson<ImportLocalRunResponse>(response)
}
