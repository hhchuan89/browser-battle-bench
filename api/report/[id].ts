import { badRequest, getRequestBaseUrl, methodNotAllowed, notFound, serverError, json } from '../_lib/http'
import { loadServerEnv } from '../_lib/env'
import { buildReportLinks } from '../_lib/report-links'
import { getReportById } from '../_lib/report-store'

const readId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }
  return null
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const id = readId(req.query?.id)
  if (!id) {
    return badRequest(res, 'Missing report id')
  }

  try {
    const row = await getReportById(id)
    if (!row) return notFound(res, 'Report not found')

    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(req, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, row.id)

    return json(res, 200, {
      ...row,
      ...links,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(res, message)
  }
}
