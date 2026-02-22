import { createHash } from 'node:crypto'
import { getClientIp } from './http'
import { loadServerEnv } from './env'
import { SupabaseRestError, supabaseRest } from './supabase'

interface GuardRow {
  ip_hash: string
  window_start: string
  hit_count: number
}

const firstRow = <T>(value: T[] | T | null | undefined): T | undefined => {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

const buildIpHash = (ip: string, salt: string): string =>
  createHash('sha256').update(`${ip}::${salt}`).digest('hex')

const shouldFailOpen = (error: unknown): boolean => {
  if (!(error instanceof SupabaseRestError)) return false
  const payload = error.payload
  if (typeof payload !== 'object' || payload === null) return false

  const message = String((payload as { message?: unknown }).message || '')
  return message.includes('bbb_upload_guard')
}

const toIsoWindowStart = (windowMinutes: number): string => {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const start = Math.floor(now / windowMs) * windowMs
  return new Date(start).toISOString()
}

const isCurrentWindow = (windowStart: string, windowMinutes: number): boolean => {
  const parsed = Date.parse(windowStart)
  if (!Number.isFinite(parsed)) return false
  return Date.now() - parsed < windowMinutes * 60 * 1000
}

export const enforceUploadRateLimit = async (
  request: Request
): Promise<{ allowed: boolean; reason?: string }> => {
  const env = loadServerEnv()
  const ip = getClientIp(request)
  const ipHash = buildIpHash(ip, env.rateLimitSalt)
  const windowStart = toIsoWindowStart(env.uploadWindowMinutes)

  try {
    const selected = await supabaseRest<GuardRow[] | GuardRow>(
      `bbb_upload_guard?ip_hash=eq.${encodeURIComponent(ipHash)}&select=ip_hash,window_start,hit_count&limit=1`
    )

    const row = firstRow(selected.data)
    if (!row) {
      await supabaseRest<GuardRow[]>(`bbb_upload_guard?select=ip_hash`, {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: {
          ip_hash: ipHash,
          window_start: windowStart,
          hit_count: 1,
        },
      })
      return { allowed: true }
    }

    const currentWindow = isCurrentWindow(row.window_start, env.uploadWindowMinutes)
    const currentHits = currentWindow ? Number(row.hit_count || 0) : 0

    if (currentHits >= env.uploadLimitPerWindow) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${env.uploadLimitPerWindow} uploads per ${env.uploadWindowMinutes} minutes.`,
      }
    }

    const nextHits = currentHits + 1
    await supabaseRest<GuardRow[]>(
      `bbb_upload_guard?ip_hash=eq.${encodeURIComponent(ipHash)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal',
        },
        body: {
          window_start: currentWindow ? row.window_start : windowStart,
          hit_count: nextHits,
        },
      }
    )

    return { allowed: true }
  } catch (error) {
    if (shouldFailOpen(error)) {
      return { allowed: true }
    }
    throw error
  }
}
