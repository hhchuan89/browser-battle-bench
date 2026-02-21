import QRCode from 'qrcode'
import type { ShareResultPayload } from '@/types/share'

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630
const PADDING = 48
const PANEL_RADIUS = 14
const PANEL_BORDER = '#14532d'
const PANEL_FILL = '#030712'
const PRIMARY_TEXT = '#bbf7d0'
const SECONDARY_TEXT = '#4ade80'
const TERTIARY_TEXT = '#22c55e'

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
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) => {
  ctx.font = "500 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = SECONDARY_TEXT
  ctx.fillText(label, x, y)

  ctx.font = "600 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = PRIMARY_TEXT
  const rendered = trimToWidth(ctx, value, width - 220)
  const valueWidth = ctx.measureText(rendered).width
  ctx.fillText(rendered, x + width - valueWidth, y)
}

const drawScoreCard = (
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  drawRoundedRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = PANEL_FILL
  ctx.fill()
  ctx.strokeStyle = PANEL_BORDER
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "500 20px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = SECONDARY_TEXT
  ctx.fillText(label, x + 16, y + 32)

  ctx.font = "700 42px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = PRIMARY_TEXT
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

export const createShareCardFile = async (payload: ShareResultPayload): Promise<File> => {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to create share card context')

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
  gradient.addColorStop(0, '#052e16')
  gradient.addColorStop(1, '#020617')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  ctx.strokeStyle = '#166534'
  ctx.lineWidth = 3
  drawRoundedRect(ctx, 12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24, 22)
  ctx.stroke()

  ctx.font = "600 22px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = TERTIARY_TEXT
  ctx.fillText('BROWSER BATTLE BENCH', PADDING, 72)

  ctx.font = "800 52px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = PRIMARY_TEXT
  ctx.fillText(`${payload.badgeText} ${payload.grade}`, PADDING, 126)

  ctx.font = "500 24px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = SECONDARY_TEXT
  ctx.fillText(trimToWidth(ctx, payload.scenarioName, CARD_WIDTH - PADDING * 2), PADDING, 160)

  const infoPanelY = 184
  const infoPanelHeight = 136
  drawRoundedRect(ctx, PADDING, infoPanelY, CARD_WIDTH - PADDING * 2, infoPanelHeight, PANEL_RADIUS)
  ctx.fillStyle = PANEL_FILL
  ctx.fill()
  ctx.strokeStyle = PANEL_BORDER
  ctx.lineWidth = 2
  ctx.stroke()

  drawLabelValue(ctx, 'Model', payload.modelId, PADDING + 20, infoPanelY + 38, CARD_WIDTH - PADDING * 2 - 40)
  drawLabelValue(
    ctx,
    'Hardware',
    payload.hardwareLabel || 'Unknown',
    PADDING + 20,
    infoPanelY + 78,
    CARD_WIDTH - PADDING * 2 - 40
  )
  drawLabelValue(
    ctx,
    'Run Ref',
    payload.runRef || 'N/A',
    PADDING + 20,
    infoPanelY + 118,
    CARD_WIDTH - PADDING * 2 - 40
  )

  const scorePanelY = 344
  const scorePanelHeight = 132
  drawRoundedRect(ctx, PADDING, scorePanelY, CARD_WIDTH - PADDING * 2, scorePanelHeight, PANEL_RADIUS)
  ctx.fillStyle = PANEL_FILL
  ctx.fill()
  ctx.strokeStyle = PANEL_BORDER
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = "600 20px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = SECONDARY_TEXT
  ctx.fillText('Battle Dimensions', PADDING + 20, scorePanelY + 30)

  const gap = 16
  const scoreCardWidth = (CARD_WIDTH - PADDING * 2 - 20 * 2 - gap * 2) / 3
  const scoreCardY = scorePanelY + 40
  const scoreCardHeight = 84
  const scoreStartX = PADDING + 20
  drawScoreCard(
    ctx,
    'Obedience',
    payload.scores.obedience,
    scoreStartX,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )
  drawScoreCard(
    ctx,
    'Intelligence',
    payload.scores.intelligence,
    scoreStartX + scoreCardWidth + gap,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )
  drawScoreCard(
    ctx,
    'Stability',
    payload.scores.stability,
    scoreStartX + (scoreCardWidth + gap) * 2,
    scoreCardY,
    scoreCardWidth,
    scoreCardHeight
  )

  ctx.font = "500 24px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = PRIMARY_TEXT
  drawWrappedText(
    ctx,
    `"${payload.taunt}"`,
    PADDING,
    530,
    CARD_WIDTH - PADDING * 2 - 180,
    30,
    2
  )

  ctx.font = "500 18px Menlo, Monaco, 'Courier New', monospace"
  ctx.fillStyle = TERTIARY_TEXT
  ctx.fillText('browserbattlebench.vercel.app', PADDING, 590)

  const qrDataUrl = await QRCode.toDataURL(payload.shareUrl, {
    width: 160,
    margin: 1,
    color: {
      dark: '#22c55e',
      light: '#000000',
    },
  })
  const qrImage = await loadImage(qrDataUrl)
  ctx.drawImage(qrImage, CARD_WIDTH - PADDING - 136, 482, 136, 136)
  ctx.strokeStyle = PANEL_BORDER
  ctx.lineWidth = 2
  drawRoundedRect(ctx, CARD_WIDTH - PADDING - 136, 482, 136, 136, 10)
  ctx.stroke()

  const blob = await toBlob(canvas)
  if (!blob) throw new Error('Unable to generate share card image')
  return new File([blob], `bbb-share-${Date.now()}.png`, { type: 'image/png' })
}
