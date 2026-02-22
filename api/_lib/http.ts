interface NodeResponseLike {
  status: (code: number) => NodeResponseLike
  setHeader: (name: string, value: string) => void
  send: (body: string) => void
}

export const json = (
  res: NodeResponseLike,
  status: number,
  payload: Record<string, unknown>
): void => {
  res.status(status)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.send(JSON.stringify(payload))
}

export const methodNotAllowed = (res: NodeResponseLike, allowed: string[]): void => {
  json(res, 405, { error: `Method not allowed. Allowed: ${allowed.join(', ')}` })
}

export const badRequest = (res: NodeResponseLike, error: string): void => {
  json(res, 400, { error })
}

export const tooManyRequests = (res: NodeResponseLike, error: string): void => {
  json(res, 429, { error })
}

export const notFound = (res: NodeResponseLike, error = 'Not found'): void => {
  json(res, 404, { error })
}

export const serverError = (res: NodeResponseLike, error = 'Internal server error'): void => {
  json(res, 500, { error })
}

export const readBody = async <T>(req: any): Promise<T> => {
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

  const headers = req?.headers || {}
  const forwardedProto = (headers['x-forwarded-proto'] as string | undefined) || 'https'
  const host =
    (headers['x-forwarded-host'] as string | undefined) ||
    (headers.host as string | undefined) ||
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
  const forwardedFor = req?.headers?.['x-forwarded-for']

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return String(forwardedFor[0]).split(',')[0].trim()
  }

  return req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || 'unknown'
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
