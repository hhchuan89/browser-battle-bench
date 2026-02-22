export const json = (
  status: number,
  payload: Record<string, unknown>,
  headers?: Record<string, string>
): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(headers || {}),
    },
  })

export const methodNotAllowed = (allowed: string[]): Response =>
  json(405, { error: `Method not allowed. Allowed: ${allowed.join(', ')}` })

export const badRequest = (error: string): Response =>
  json(400, { error })

export const tooManyRequests = (error: string): Response =>
  json(429, { error })

export const notFound = (error = 'Not found'): Response =>
  json(404, { error })

export const serverError = (error = 'Internal server error'): Response =>
  json(500, { error })

export const readBody = async <T>(request: Request): Promise<T> => {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await request.json()) as T
  }

  const raw = await request.text()
  if (!raw.trim()) return {} as T
  return JSON.parse(raw) as T
}

export const getRequestBaseUrl = (request: Request, fallbackBaseUrl: string): string => {
  if (fallbackBaseUrl && fallbackBaseUrl.trim()) return fallbackBaseUrl
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

export const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
