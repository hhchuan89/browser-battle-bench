import { badRequest, escapeHtml, getRequestBaseUrl, methodNotAllowed, serverError } from '../_lib/http'
import { loadServerEnv } from '../_lib/env'
import { buildReportLinks } from '../_lib/report-links'
import { getReportById } from '../_lib/report-store'

const readId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }
  return null
}

const modeLabel = (mode: string): string =>
  mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()

const toMetaHtml = (input: {
  title: string
  description: string
  canonicalUrl: string
  shareUrl: string
  imageUrl: string
}): string => {
  const title = escapeHtml(input.title)
  const description = escapeHtml(input.description)
  const canonical = escapeHtml(input.canonicalUrl)
  const share = escapeHtml(input.shareUrl)
  const image = escapeHtml(input.imageUrl)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Browser Battle Bench" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${share}" />
  <meta property="og:image" content="${image}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

  <meta http-equiv="refresh" content="0;url=${canonical}" />
  <link rel="canonical" href="${canonical}" />
</head>
<body>
  <p>Redirecting to report… <a href="${canonical}">Continue</a></p>
  <script>window.location.replace(${JSON.stringify(input.canonicalUrl)});</script>
</body>
</html>`
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET'])
  }

  const id = readId(req.query?.id)
  if (!id) {
    return badRequest(res, 'Missing report id')
  }

  try {
    const report = await getReportById(id)
    if (!report) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send('<!doctype html><title>Report not found</title><p>Report not found.</p>')
      return
    }

    const env = loadServerEnv()
    const baseUrl = getRequestBaseUrl(req, env.appBaseUrl)
    const links = buildReportLinks(baseUrl, report.id)

    const title = `BBB ${modeLabel(report.mode)} | ${report.grade} ${report.score.toFixed(1)} - ${report.scenario_name}`
    const description = `${report.model_id} on tier ${report.tier}. View full public report and challenge link.`

    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(
      toMetaHtml({
        title,
        description,
        canonicalUrl: links.canonical_url,
        shareUrl: links.share_url,
        imageUrl: links.og_image_url,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(res, message)
  }
}
