export const json = (res: any, status: number, payload: Record<string, unknown>) => {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.send(JSON.stringify(payload))
}

export const methodNotAllowed = (res: any, allowed: string[]) =>
  json(res, 405, { error: `Method not allowed. Allowed: ${allowed.join(', ')}` })

export const badRequest = (res: any, error: string) =>
  json(res, 400, { error })

export const tooManyRequests = (res: any, error: string) =>
  json(res, 429, { error })

export const notFound = (res: any, error = 'Not found') =>
  json(res, 404, { error })

export const serverError = (res: any, error = 'Internal server error') =>
  json(res, 500, { error })

export const readBody = async <T>(req: any): Promise<T> => {
  if (req.body && typeof req.body === 'object') return req.body as T
  if (typeof req.body === 'string') return JSON.parse(req.body) as T

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
  if (fallbackBaseUrl) return fallbackBaseUrl
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined) || 'https'
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host
  if (!host) return 'https://browserbattlebench.vercel.app'
  return `${forwardedProto}://${host}`
}

export const getClientIp = (req: any): string => {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return String(forwardedFor[0]).split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
