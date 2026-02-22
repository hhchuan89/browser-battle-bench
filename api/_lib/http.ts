interface NodeResponseLike {
  status?: (code: number) => NodeResponseLike
  statusCode?: number
  setHeader: (name: string, value: string) => void
  send?: (body: string) => void
  end?: (body: string) => void
}

type ResponseTarget = NodeResponseLike | undefined | null
type HeaderInput = Headers | Record<string, string | string[] | undefined> | undefined | null

const isNodeResponse = (value: unknown): value is NodeResponseLike => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.setHeader === 'function' &&
    (typeof candidate.send === 'function' || typeof candidate.end === 'function')
  )
}

const readHeader = (headers: HeaderInput, key: string): string | null => {
  if (!headers) return null
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(key)
  }

  const map = headers as Record<string, string | string[] | undefined>
  const direct = map[key] ?? map[key.toLowerCase()] ?? map[key.toUpperCase()]

  if (typeof direct === 'string') return direct
  if (Array.isArray(direct) && direct[0]) return String(direct[0])
  return null
}

const send = (
  res: ResponseTarget,
  status: number,
  body: string,
  contentType: string,
  headers: Record<string, string> = {}
): void | Response => {
  if (isNodeResponse(res)) {
    if (typeof res.status === 'function') {
      res.status(status)
    } else {
      res.statusCode = status
    }
    res.setHeader('Content-Type', contentType)
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value))
    if (typeof res.send === 'function') {
      res.send(body)
    } else if (typeof res.end === 'function') {
      res.end(body)
    }
    return
  }

  const responseHeaders = new Headers({
    'Content-Type': contentType,
    ...headers,
  })
  return new Response(body, {
    status,
    headers: responseHeaders,
  })
}

export const json = (
  res: ResponseTarget,
  status: number,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {}
): void | Response =>
  send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8', headers)

export const html = (
  res: ResponseTarget,
  status: number,
  body: string,
  headers: Record<string, string> = {}
): void | Response =>
  send(res, status, body, 'text/html; charset=utf-8', headers)

export const text = (
  res: ResponseTarget,
  status: number,
  body: string,
  headers: Record<string, string> = {}
): void | Response =>
  send(res, status, body, 'text/plain; charset=utf-8', headers)

export const methodNotAllowed = (res: ResponseTarget, allowed: string[]): void | Response =>
  json(
    res,
    405,
    { error: `Method not allowed. Allowed: ${allowed.join(', ')}` },
    { Allow: allowed.join(', ') }
  )

export const badRequest = (res: ResponseTarget, error: string): void | Response =>
  json(res, 400, { error })

export const tooManyRequests = (res: ResponseTarget, error: string): void | Response =>
  json(res, 429, { error })

export const notFound = (res: ResponseTarget, error = 'Not found'): void | Response =>
  json(res, 404, { error })

export const serverError = (res: ResponseTarget, error = 'Internal server error'): void | Response =>
  json(res, 500, { error })

export const readBody = async <T>(req: any): Promise<T> => {
  if (req && typeof req.json === 'function') {
    return (await req.json()) as T
  }

  if (req?.body && typeof req.body === 'object') {
    return req.body as T
  }
  if (typeof req?.body === 'string') {
    return JSON.parse(req.body) as T
  }

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve())
    req.on('error', (error: Error) => reject(error))
  })

  const raw = Buffer.concat(chunks).toString('utf8')
  return (raw ? JSON.parse(raw) : {}) as T
}

export const getRequestBaseUrl = (req: any, fallbackBaseUrl: string): string => {
  if (fallbackBaseUrl && fallbackBaseUrl.trim()) return fallbackBaseUrl

  const headers = (req?.headers || null) as HeaderInput
  const forwardedProto = readHeader(headers, 'x-forwarded-proto') || 'https'
  const host =
    readHeader(headers, 'x-forwarded-host') ||
    readHeader(headers, 'host') ||
    'browserbattlebench.vercel.app'

  return `${forwardedProto}://${host}`
}

export const getRequestUrl = (req: any, fallbackBaseUrl: string): URL => {
  const base = getRequestBaseUrl(req, fallbackBaseUrl)
  const rawPath = typeof req?.url === 'string' && req.url.trim() ? req.url : '/'
  const absolute = rawPath.startsWith('http') ? rawPath : `${base}${rawPath}`
  return new URL(absolute)
}

export const getClientIp = (req: any): string => {
  const headers = (req?.headers || null) as HeaderInput
  const forwardedFor = readHeader(headers, 'x-forwarded-for')

  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = readHeader(headers, 'x-real-ip')
  return realIp || req?.socket?.remoteAddress || 'unknown'
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
