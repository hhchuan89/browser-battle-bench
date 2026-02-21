import QRCode from 'qrcode'
import type { ShareMode, ShareResultPayload } from '@/types/share'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630
const PADDING = 48
const PANEL_RADIUS = 14

interface ShareTheme {
  stageLabel: string
  icon: string
  gradientFrom: string
  gradientTo: string
  border: string
  panelFill: string
  panelBorder: string
  primaryText: string
  secondaryText: string
  tertiaryText: string
  badgeBg: string
}

const THEMES: Record<ShareMode, ShareTheme> = {
  arena: {
    stageLabel: 'ARENA',
    icon: '⚔',
    gradientFrom: '#3f0c0c',
    gradientTo: '#1f1012',
    border: '#f97316',
    panelFill: '#211214',
    panelBorder: '#7c2d12',
    primaryText: '#ffedd5',
    secondaryText: '#fdba74',
    tertiaryText: '#fb923c',
    badgeBg: '#7c2d12',
  },
  quick: {
    stageLabel: 'QUICK',
    icon: '⚡',
    gradientFrom: '#082f49',
    gradientTo: '#0c1427',
    border: '#22d3ee',
    panelFill: '#0b1a2f',
    panelBorder: '#0e7490',
    primaryText: '#e0f2fe',
    secondaryText: '#67e8f9',
    tertiaryText: '#22d3ee',
    badgeBg: '#155e75',
  },
  gauntlet: {
    stageLabel: 'GAUNTLET',
    icon: '🛡',
    gradientFrom: '#1f2937',
    gradientTo: '#3f1d4a',
    border: '#c084fc',
    panelFill: '#251532',
    panelBorder: '#6b21a8',
    primaryText: '#f5d0fe',
    secondaryText: '#d8b4fe',
    tertiaryText: '#c084fc',
    badgeBg: '#581c87',
  },
  stress: {
    stageLabel: 'STRESS',
    icon: '🔥',
    gradientFrom: '#431407',
    gradientTo: '#2b1024',
    border: '#fb7185',
    panelFill: '#2f1321',
    panelBorder: '#be123c',
    primaryText: '#ffe4e6',
    secondaryText: '#fda4af',
    tertiaryText: '#fb7185',
    badgeBg: '#9f1239',
  },
  history: {
    stageLabel: 'HISTORY',
    icon: '📜',
    gradientFrom: '#1f2937',
    gradientTo: '#0f172a',
    border: '#38bdf8',
    panelFill: '#111827',
    panelBorder: '#075985',
    primaryText: '#e0f2fe',
    secondaryText: '#7dd3fc',
    tertiaryText: '#38bdf8',
    badgeBg: '#0c4a6e',
  },
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

const trimToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string => {
  if (ctx.measureText(text).width <= maxWidth) return text
  let end = text.length
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}...`).width > maxWidth) {
    end -= 1
  }
  return `${text.slice(0, Math.max(end, 0))}...`
}

const drawLabelValue = (
  ctx: CanvasRenderingContext2D,
  theme: ShareTheme,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) => {
  ctx.font = "500 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.secondaryText
  ctx.fillText(label, x, y)

  ctx.font = "600 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.primaryText
  const rendered = trimToWidth(ctx, value, width - 220)
  const valueWidth = ctx.measureText(rendered).width
  ctx.fillText(rendered, x + width - valueWidth, y)
}

const drawScoreCard = (
  ctx: CanvasRenderingContext2D,
  theme: ShareTheme,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  drawRoundedRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = theme.panelFill
  ctx.fill()
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "500 20px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.secondaryText
  ctx.fillText(label, x + 16, y + 32)

  ctx.font = "700 42px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.primaryText
  ctx.fillText(`${value.toFixed(1)}%`, x + 16, y + 84)
}

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
    if (lines.length === maxLines - 1) break
  }

  if (lines.length < maxLines && current) lines.push(current)

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = trimToWidth(ctx, lines[maxLines - 1], maxWidth)
  }

  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
}

const loadImage = (source: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to render QR image'))
    image.src = source
  })

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((value) => resolve(value), 'image/png'))

const getTheme = (mode: ShareMode): ShareTheme => THEMES[mode]

const drawModeBadge = (
  ctx: CanvasRenderingContext2D,
  theme: ShareTheme,
  x: number,
  y: number
) => {
  drawRoundedRect(ctx, x, y, 188, 48, 12)
  ctx.fillStyle = theme.badgeBg
  ctx.fill()
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "700 24px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.primaryText
  ctx.fillText(theme.stageLabel, x + 18, y + 32)
}

const drawModeIcon = (ctx: CanvasRenderingContext2D, theme: ShareTheme) => {
  const x = CARD_WIDTH - PADDING - 96
  const y = 34
  drawRoundedRect(ctx, x, y, 96, 96, 16)
  ctx.fillStyle = theme.badgeBg
  ctx.fill()
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "700 56px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(theme.icon, x + 48, y + 56)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

export const createShareCardFile = async (payload: ShareResultPayload): Promise<File> => {
  const theme = getTheme(payload.mode)
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to create share card context')

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  gradient.addColorStop(0, theme.gradientFrom)
  gradient.addColorStop(1, theme.gradientTo)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  ctx.strokeStyle = theme.border
  ctx.lineWidth = 3
  drawRoundedRect(ctx, 12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24, 22)
  ctx.stroke()

  drawModeBadge(ctx, theme, PADDING, 36)
  drawModeIcon(ctx, theme)

  ctx.font = "600 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.tertiaryText
  ctx.fillText('BROWSER BATTLE BENCH', PADDING, 146)

  ctx.font = "800 52px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.primaryText
  ctx.fillText(`${payload.badgeText} ${payload.grade}`, PADDING, 202)

  ctx.font = "500 24px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.secondaryText
  ctx.fillText(trimToWidth(ctx, payload.scenarioName, CARD_WIDTH - PADDING * 2), PADDING, 238)

  const infoPanelY = 258
  const infoPanelHeight = 136
  drawRoundedRect(
    ctx,
    PADDING,
    infoPanelY,
    CARD_WIDTH - PADDING * 2,
    infoPanelHeight,
    PANEL_RADIUS
  )
  ctx.fillStyle = theme.panelFill
  ctx.fill()
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  ctx.stroke()

  drawLabelValue(
    ctx,
    theme,
    'Model',
    payload.modelId,
    PADDING + 20,
    infoPanelY + 38,
    CARD_WIDTH - PADDING * 2 - 40
  )
  drawLabelValue(
    ctx,
    theme,
    'Hardware',
    payload.hardwareLabel || 'Unknown',
    PADDING + 20,
    infoPanelY + 78,
    CARD_WIDTH - PADDING * 2 - 40
  )
  drawLabelValue(
    ctx,
    theme,
    'Run Ref',
    payload.runRef || 'N/A',
    PADDING + 20,
    infoPanelY + 118,
    CARD_WIDTH - PADDING * 2 - 40
  )

  const scorePanelY = 418
  const scorePanelHeight = 132
  drawRoundedRect(
    ctx,
    PADDING,
    scorePanelY,
    CARD_WIDTH - PADDING * 2,
    scorePanelHeight,
    PANEL_RADIUS
  )
  ctx.fillStyle = theme.panelFill
  ctx.fill()
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "600 20px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.secondaryText
  ctx.fillText('Battle Dimensions', PADDING + 20, scorePanelY + 30)

  const gap = 16
  const scoreCardWidth = (CARD_WIDTH - PADDING * 2 - 20 * 2 - gap * 2) / 3
  const scoreCardY = scorePanelY + 40
  const scoreCardHeight = 84
  const scoreStartX = PADDING + 20
  drawScoreCard(
    ctx,
    theme,
    'Obedience',
    payload.scores.obedience,
    scoreStartX,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )
  drawScoreCard(
    ctx,
    theme,
    'Intelligence',
    payload.scores.intelligence,
    scoreStartX + scoreCardWidth + gap,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )
  drawScoreCard(
    ctx,
    theme,
    'Stability',
    payload.scores.stability,
    scoreStartX + (scoreCardWidth + gap) * 2,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )

  ctx.font = "500 24px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.primaryText
  drawWrappedText(
    ctx,
    `"${payload.taunt}"`,
    PADDING,
    576,
    CARD_WIDTH - PADDING * 2 - 180,
    30,
    2
  )

  ctx.font = "500 18px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = theme.tertiaryText
  ctx.fillText('browserbattlebench.vercel.app', PADDING, 612)

  const qrDataUrl = await QRCode.toDataURL(payload.challengeUrl, {
    width: 160,
    margin: 1,
    color: {
      dark: theme.tertiaryText,
      light: '#000000',
    },
  })
  const qrImage = await loadImage(qrDataUrl)
  ctx.drawImage(qrImage, CARD_WIDTH - PADDING - 136, 484, 136, 136)
  ctx.strokeStyle = theme.panelBorder
  ctx.lineWidth = 2
  drawRoundedRect(ctx, CARD_WIDTH - PADDING - 136, 484, 136, 136, 10)
  ctx.stroke()

  const blob = await toBlob(canvas)
  if (!blob) throw new Error('Unable to generate share card image')
  return new File([blob], `bbb-share-${payload.mode}-${Date.now()}.png`, {
    type: 'image/png',
  })
}
