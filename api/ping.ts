import { json, methodNotAllowed } from './_lib/http'

export default function handler(req: any, res?: any): void | Response {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  return json(res, 200, { ok: true, ts: new Date().toISOString() })
}
