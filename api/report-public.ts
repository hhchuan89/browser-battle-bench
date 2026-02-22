import { badRequest, getRequestBaseUrl, getRequestUrl, methodNotAllowed, notFound, sendResponse, serverError, json } from './_lib/http'
import { loadServerEnv } from './_lib/env'
import { buildReportLinks } from './_lib/report-links'
import { getReportById } from './_lib/report-store'

export default async function handler(request: any, response?: any): Promise<Response | void> {
  const respond = (value: Response) => sendResponse(value, response)

  if (request.method !== 'GET') {
    return respond(methodNotAllowed(['GET']))
  }

  const env = loadServerEnv()
  const requestUrl = getRequestUrl(request, env.appBaseUrl)
  const id = requestUrl.searchParams.get('id')?.trim() || ''
  if (!id) {
    return respond(badRequest('Missing report id'))
  }

  try {
    const row = await getReportById(id)
    if (!row) return respond(notFound('Report not found'))

    const baseUrl = getRequestBaseUrl(request, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, row.id)

    return respond(
      json(200, {
        ...row,
        ...links,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return respond(serverError(message))
  }
}
