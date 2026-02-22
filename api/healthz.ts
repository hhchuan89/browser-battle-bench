export default function handler(_req: any, res: any): void {
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
  }
  if (typeof res?.status === 'function') {
    res.status(200)
  } else {
    res.statusCode = 200
  }
  if (typeof res?.send === 'function') {
    res.send('{"ok":true}')
    return
  }
  res.end('{"ok":true}')
}
