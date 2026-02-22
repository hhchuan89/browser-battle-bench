interface NodeResponseLike {
  status: (code: number) => NodeResponseLike
  setHeader: (name: string, value: string) => void
  send: (body: string) => void
}

const isRequestLike = (value: unknown): value is Request =>
  typeof Request !== 'undefined' && value instanceof Request

const toNodeHeaderValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(',')
  if (value === undefined || value === null) return ''
  return String(value)
}

const toHeaders = (request: any): Headers => {
  if (isRequestLike(request)) return request.headers
  const headers = new Headers()
  const source = request?.headers as Record<string, unknown> | undefined
  if (!source || typeof source !== 'object') return headers
  for (const [key, value] of Object.entries(source)) {
    headers.set(key, toNodeHeaderValue(value))
  }
  return headers
}

const isNodeResponse = (value: unknown): value is NodeResponseLike =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as NodeResponseLike).status === 'function' &&
  typeof (value as NodeResponseLike).setHeader === 'function' &&
  typeof (value as NodeResponseLike).send === 'function'

export const sendResponse = async (
  response: Response,
  nodeResponse?: unknown
): Promise<Response | void> => {
  if (!isNodeResponse(nodeResponse)) return response

  const body = await response.text()
  nodeResponse.status(response.status)
  response.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value)
  })
  nodeResponse.send(body)
}

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

export const readBody = async <T>(request: any): Promise<T> => {
  if (isRequestLike(request)) {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return (await request.json()) as T
    }

    const raw = await request.text()
    if (!raw.trim()) return {} as T
    return JSON.parse(raw) as T
  }

  if (request?.body && typeof request.body === 'object') {
    return request.body as T
  }
  if (typeof request?.body === 'string') {
    return JSON.parse(request.body) as T
  }

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => resolve())
    request.on('error', (error: Error) => reject(error))
  })
  const raw = Buffer.concat(chunks).toString('utf8')
  return (raw ? JSON.parse(raw) : {}) as T
}

export const getRequestBaseUrl = (request: any, fallbackBaseUrl: string): string => {
  if (fallbackBaseUrl && fallbackBaseUrl.trim()) return fallbackBaseUrl

  if (isRequestLike(request)) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }

  const headers = toHeaders(request)
  const forwardedProto = headers.get('x-forwarded-proto') || 'https'
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'browserbattlebench.vercel.app'
  return `${forwardedProto}://${host}`
}

export const getRequestUrl = (request: any, fallbackBaseUrl: string): URL => {
  if (isRequestLike(request)) {
    return new URL(request.url)
  }

  const base = getRequestBaseUrl(request, fallbackBaseUrl)
  const rawPath = typeof request?.url === 'string' && request.url.trim() ? request.url : '/'
  const path = rawPath.startsWith('http') ? rawPath : `${base}${rawPath}`
  return new URL(path)
}

export const getClientIp = (request: any): string => {
  const headers = toHeaders(request)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  return headers.get('x-real-ip') || request?.socket?.remoteAddress || 'unknown'
}

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
