import { badRequest, getRequestUrl, methodNotAllowed, serverError, json } from './_lib/http'
import type { PublishMode } from './_lib/contracts'
import { listReports } from './_lib/report-store'
import { loadServerEnv } from './_lib/env'

const VALID_MODES: Array<PublishMode | 'all'> = ['all', 'arena', 'quick', 'gauntlet', 'stress']

const parseLimit = (value: string | null): number => {
  if (value && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(100, parsed))
    }
  }
  return 25
}

const parseMode = (value: string | null): PublishMode | 'all' => {
  if (value && value.trim()) {
    const normalized = value.trim().toLowerCase()
    if (VALID_MODES.includes(normalized as PublishMode | 'all')) {
      return normalized as PublishMode | 'all'
    }
  }
  return 'all'
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const env = loadServerEnv()
  const requestUrl = getRequestUrl(req, env.appBaseUrl)
  const mode = parseMode(requestUrl.searchParams.get('mode'))
  if (!VALID_MODES.includes(mode)) {
    return badRequest(res, `mode must be one of: ${VALID_MODES.join(', ')}`)
  }

  const limit = parseLimit(requestUrl.searchParams.get('limit'))

  try {
    const expandedLimit = mode === 'all' ? limit : Math.max(limit * 4, 80)
    const rows = await listReports({
      limit: expandedLimit,
      mode,
    })

    return json(res, 200, {
      rows: rows.slice(0, limit),
      total: rows.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(res, message)
  }
}
