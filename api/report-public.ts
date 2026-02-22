import { badRequest, getRequestBaseUrl, methodNotAllowed, notFound, serverError, json } from './_lib/http'
import { loadServerEnv } from './_lib/env'
import { buildReportLinks } from './_lib/report-links'
import { getReportById } from './_lib/report-store'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return methodNotAllowed(['GET'])
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) {
    return badRequest('Missing report id')
  }

  try {
    const row = await getReportById(id)
    if (!row) return notFound('Report not found')

    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(request, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, row.id)

    return json(200, {
      ...row,
      ...links,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(message)
  }
}
