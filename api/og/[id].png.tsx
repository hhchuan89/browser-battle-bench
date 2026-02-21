/* eslint-disable react/jsx-key */
import { ImageResponse } from '@vercel/og'
import { getReportById } from '../_lib/report-store'

export const config = {
  runtime: 'edge',
}

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

const extractIdFromPath = (pathname: string): string | null => {
  const matched = pathname.match(/\/api\/og\/([^/]+)\.png$/)
  if (!matched) return null
  const value = decodeURIComponent(matched[1] || '').trim()
  return value || null
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const id = extractIdFromPath(url.pathname)
    if (!id) {
      return new Response('Missing report id', { status: 400 })
    }

    const report = await getReportById(id)
    if (!report) {
      return new Response('Report not found', { status: 404 })
    }

    const theme = THEMES[report.mode] || THEMES.quick
    const scoreText = `${report.score.toFixed(1)}`
    const gradeTint = gradeColor(report.grade)

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px',
            background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
            color: theme.text,
            border: `6px solid ${theme.accent}`,
            fontFamily: 'ui-monospace, Menlo, Monaco, "Courier New", monospace',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 36, fontWeight: 700 }}>
              <span>🏟️</span>
              <span>BROWSER BATTLE BENCH</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: `2px solid ${theme.accent}`,
                borderRadius: 999,
                padding: '8px 16px',
                fontSize: 24,
                fontWeight: 700,
                color: theme.soft,
              }}
            >
              <span>{theme.icon}</span>
              <span>{theme.modeLabel}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 20,
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 700 }}>{report.scenario_name}</div>
            <div style={{ fontSize: 28, color: theme.soft }}>{report.model_id}</div>
            <div style={{ fontSize: 22, color: theme.soft }}>Tier {report.tier}</div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: theme.panel,
                border: `2px solid ${theme.accent}`,
                borderRadius: 18,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 22, color: theme.soft }}>Score</div>
              <div style={{ fontSize: 78, fontWeight: 800, color: gradeTint, lineHeight: 1.05 }}>
                {scoreText}
              </div>
            </div>
            <div
              style={{
                width: 260,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: theme.panel,
                border: `2px solid ${theme.accent}`,
                borderRadius: 18,
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 22, color: theme.soft }}>Grade</div>
              <div style={{ fontSize: 92, fontWeight: 800, color: gradeTint, lineHeight: 1.05 }}>
                {report.grade}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(`Failed to generate image: ${message}`, { status: 500 })
  }
}
