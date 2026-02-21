export interface ServerEnv {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  appBaseUrl: string
  uploadLimitPerWindow: number
  uploadWindowMinutes: number
  rateLimitSalt: string
}

const ensureEnv = (key: string): string => {
  const value = process.env[key]
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value.trim()
}

const optionalInt = (key: string, fallback: number): number => {
  const raw = process.env[key]
  if (!raw || !raw.trim()) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

export const loadServerEnv = (): ServerEnv => {
  const appBase = process.env.APP_BASE_URL?.trim() || 'https://browserbattlebench.vercel.app'
  return {
    supabaseUrl: trimTrailingSlash(ensureEnv('SUPABASE_URL')),
    supabaseServiceRoleKey: ensureEnv('SUPABASE_SERVICE_ROLE_KEY'),
    appBaseUrl: trimTrailingSlash(appBase),
    uploadLimitPerWindow: optionalInt('BBB_UPLOAD_LIMIT', 20),
    uploadWindowMinutes: optionalInt('BBB_UPLOAD_WINDOW_MINUTES', 10),
    rateLimitSalt: process.env.BBB_RATE_LIMIT_SALT?.trim() || '',
  }
}
