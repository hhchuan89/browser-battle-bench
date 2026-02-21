import { badRequest, getRequestBaseUrl, methodNotAllowed, readBody, serverError, tooManyRequests, json } from '../_lib/http'
import { loadServerEnv } from '../_lib/env'
import { validatePublishReportInput } from '../_lib/report-validation'
import { enforceUploadRateLimit } from '../_lib/rate-limit'
import { buildReportLinks } from '../_lib/report-links'
import { insertReport } from '../_lib/report-store'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST'])
  }

  let rawBody: unknown
  try {
    rawBody = await readBody<unknown>(req)
  } catch {
    return badRequest(res, 'Invalid JSON request body')
  }

  try {
    const parsed = validatePublishReportInput(rawBody)
    if (parsed.ok === false) {
      return badRequest(res, parsed.error)
    }

    const limiter = await enforceUploadRateLimit(req)
    if (!limiter.allowed) {
      return tooManyRequests(res, limiter.reason || 'Too many requests')
    }

    const created = await insertReport(parsed.value)
    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(req, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, created.id)
    return json(res, 200, { ...links })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(res, message)
  }
}
