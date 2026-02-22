import { loadServerEnv } from './env.js'

export class SupabaseRestError extends Error {
  status: number
  payload?: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = 'SupabaseRestError'
    this.status = status
    this.payload = payload
  }
}

interface SupabaseRestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

const parseJson = (text: string): unknown => {
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const supabaseRest = async <T>(
  path: string,
  options: SupabaseRestOptions = {}
): Promise<{ data: T; headers: Headers }> => {
  const env = loadServerEnv()
  const method = options.method || 'GET'

  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const raw = await response.text()
  const parsed = parseJson(raw)

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : `Supabase request failed with status ${response.status}`
    throw new SupabaseRestError(response.status, message, parsed)
  }

  return {
    data: parsed as T,
    headers: response.headers,
  }
}
