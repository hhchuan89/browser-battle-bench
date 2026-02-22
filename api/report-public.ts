import { badRequest, getRequestBaseUrl, getRequestUrl, methodNotAllowed, notFound, serverError, json } from './_lib/http'
import { loadServerEnv } from './_lib/env'
import { buildReportLinks } from './_lib/report-links'
import { getReportById } from './_lib/report-store'

export default async function handler(req: any, res?: any): Promise<void | Response> {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  try {
    const env = loadServerEnv()
    const requestUrl = getRequestUrl(req, env.appBaseUrl)
    const id = requestUrl.searchParams.get('id')?.trim() || ''
    if (!id) {
      return badRequest(res, 'Missing report id')
    }

    const row = await getReportById(id)
    if (!row) return notFound(res, 'Report not found')

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
