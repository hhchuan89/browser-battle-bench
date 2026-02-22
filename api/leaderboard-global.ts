import { badRequest, methodNotAllowed, serverError, json } from './_lib/http'
import type { PublishMode } from './_lib/contracts'
import { listReports } from './_lib/report-store'

export const config = {
  runtime: 'nodejs',
}

const VALID_MODES: Array<PublishMode | 'all'> = ['all', 'arena', 'quick', 'gauntlet', 'stress']

const parseLimit = (value: unknown): number => {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(100, parsed))
    }
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return parseLimit(value[0])
  }
  return 25
}

const parseMode = (value: unknown): PublishMode | 'all' => {
  if (typeof value === 'string' && value.trim()) {
    const normalized = value.trim().toLowerCase()
    if (VALID_MODES.includes(normalized as PublishMode | 'all')) {
      return normalized as PublishMode | 'all'
    }
  }
  if (Array.isArray(value) && value[0]) {
    return parseMode(value[0])
  }
  return 'all'
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const mode = parseMode(req.query?.mode)
  if (!VALID_MODES.includes(mode)) {
    return badRequest(res, `mode must be one of: ${VALID_MODES.join(', ')}`)
  }

  const limit = parseLimit(req.query?.limit)

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
