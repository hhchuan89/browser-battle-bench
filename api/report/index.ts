import { badRequest, getRequestBaseUrl, methodNotAllowed, readBody, sendResponse, serverError, tooManyRequests, json } from '../_lib/http'
import { loadServerEnv } from '../_lib/env'
import { validatePublishReportInput } from '../_lib/report-validation'
import { enforceUploadRateLimit } from '../_lib/rate-limit'
import { buildReportLinks } from '../_lib/report-links'
import { insertReport } from '../_lib/report-store'

export default async function handler(request: any, response?: any): Promise<Response | void> {
  const respond = (value: Response) => sendResponse(value, response)

  if (request.method !== 'POST') {
    return respond(methodNotAllowed(['POST']))
  }

  let rawBody: unknown
  try {
    rawBody = await readBody<unknown>(request)
  } catch {
    return respond(badRequest('Invalid JSON request body'))
  }

  try {
    const parsed = validatePublishReportInput(rawBody)
    if (parsed.ok === false) {
      return respond(badRequest(parsed.error))
    }

    const limiter = await enforceUploadRateLimit(request)
    if (!limiter.allowed) {
      return respond(tooManyRequests(limiter.reason || 'Too many requests'))
    }

    const created = await insertReport(parsed.value)
    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(request, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, created.id)
    return respond(json(200, { ...links }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return respond(serverError(message))
  }
}
