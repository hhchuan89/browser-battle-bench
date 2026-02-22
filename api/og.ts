import { badRequest, methodNotAllowed, serverError } from './_lib/http'
import { getReportById } from './_lib/report-store'

const THEMES: Record<string, {
  icon: string
  modeLabel: string
  from: string
  to: string
  accent: string
  panel: string
  text: string
  soft: string
}> = {
  arena: {
    icon: '⚔️',
    modeLabel: 'ARENA',
    from: '#3f0f0f',
    to: '#1f1212',
    accent: '#f97316',
    panel: '#231414',
    text: '#ffedd5',
    soft: '#fdba74',
  },
  quick: {
    icon: '⚡',
    modeLabel: 'QUICK',
    from: '#042038',
    to: '#0c1724',
    accent: '#22d3ee',
    panel: '#102131',
    text: '#e0f2fe',
    soft: '#67e8f9',
  },
  gauntlet: {
    icon: '🥊',
    modeLabel: 'GAUNTLET',
    from: '#27203b',
    to: '#1a1628',
    accent: '#c084fc',
    panel: '#281f3d',
    text: '#f5d0fe',
    soft: '#d8b4fe',
  },
  stress: {
    icon: '🔥',
    modeLabel: 'STRESS',
    from: '#3d150b',
    to: '#1f131f',
    accent: '#fb7185',
    panel: '#2f1b23',
    text: '#ffe4e6',
    soft: '#fda4af',
  },
}

const gradeColor = (grade: string): string => {
  switch (grade) {
    case 'S':
      return '#22c55e'
    case 'A':
      return '#38bdf8'
    case 'B':
      return '#f59e0b'
    case 'C':
      return '#f97316'
    default:
      return '#ef4444'
  }
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const clampText = (value: string, max = 72): string => {
  const normalized = value.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, Math.max(0, max - 3))}...`
}

const buildSvg = (input: {
  mode: string
  scenarioName: string
  modelId: string
  score: number
  grade: string
  tier: string
}): string => {
  const theme = THEMES[input.mode] || THEMES.quick
  const gradeTint = gradeColor(input.grade)
  const scenarioName = escapeXml(clampText(input.scenarioName, 58))
  const modelId = escapeXml(clampText(input.modelId, 60))
  const tier = escapeXml(clampText(input.tier, 8))

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="BBB share card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.from}"/>
      <stop offset="100%" stop-color="${theme.to}"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1200" height="630" fill="url(#bg)"/>
  <rect x="12" y="12" width="1176" height="606" rx="18" fill="none" stroke="${theme.accent}" stroke-width="4"/>

  <text x="48" y="78" fill="${theme.text}" font-family="Menlo, Monaco, monospace" font-size="34" font-weight="700">🏟️ BROWSER BATTLE BENCH</text>

  <rect x="930" y="38" width="220" height="58" rx="29" fill="none" stroke="${theme.accent}" stroke-width="2"/>
  <text x="952" y="76" fill="${theme.soft}" font-family="Menlo, Monaco, monospace" font-size="28" font-weight="700">${theme.icon} ${theme.modeLabel}</text>

  <text x="48" y="168" fill="${theme.text}" font-family="Menlo, Monaco, monospace" font-size="46" font-weight="700">${scenarioName}</text>
  <text x="48" y="216" fill="${theme.soft}" font-family="Menlo, Monaco, monospace" font-size="30" font-weight="600">${modelId}</text>
  <text x="48" y="256" fill="${theme.soft}" font-family="Menlo, Monaco, monospace" font-size="24" font-weight="600">Tier ${tier}</text>

  <rect x="48" y="324" width="760" height="230" rx="18" fill="${theme.panel}" stroke="${theme.accent}" stroke-width="2"/>
  <text x="84" y="382" fill="${theme.soft}" font-family="Menlo, Monaco, monospace" font-size="34" font-weight="600">Score</text>
  <text x="84" y="496" fill="${gradeTint}" font-family="Menlo, Monaco, monospace" font-size="120" font-weight="800">${input.score.toFixed(1)}</text>

  <rect x="832" y="324" width="320" height="230" rx="18" fill="${theme.panel}" stroke="${theme.accent}" stroke-width="2"/>
  <text x="936" y="382" fill="${theme.soft}" font-family="Menlo, Monaco, monospace" font-size="34" font-weight="600">Grade</text>
  <text x="948" y="504" fill="${gradeTint}" font-family="Menlo, Monaco, monospace" font-size="132" font-weight="800">${escapeXml(input.grade)}</text>
</svg>`
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return methodNotAllowed(['GET'])
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() || ''
  if (!id) {
    return badRequest('Missing report id')
  }

  try {
    const report = await getReportById(id)
    if (!report) {
      return new Response('Report not found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    }

    const svg = buildSvg({
      mode: report.mode,
      scenarioName: report.scenario_name,
      modelId: report.model_id,
      score: report.score,
      grade: report.grade,
      tier: report.tier,
    })

    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return serverError(message)
  }
}
