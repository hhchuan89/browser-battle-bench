export interface YapMetrics {
  totalChars: number
  jsonSpanLength: number
  yapChars: number
  yapRate: number
}

const calculateJsonSpanLength = (text: string): number => {
  if (!text) return 0
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return 0
  return lastBrace - firstBrace + 1
}

const calculateYapMetrics = (text: string): YapMetrics => {
  const totalChars = text.length
  if (totalChars === 0) {
    return {
      totalChars: 0,
      jsonSpanLength: 0,
      yapChars: 0,
      yapRate: 0
    }
  }

  const jsonSpanLength = calculateJsonSpanLength(text)
  const yapChars = Math.max(0, totalChars - jsonSpanLength)
  const yapRate = Math.min(100, (yapChars / totalChars) * 100)

  return {
    totalChars,
    jsonSpanLength,
    yapChars,
    yapRate
  }
}

const calculateYapRate = (text: string): number => {
  return calculateYapMetrics(text).yapRate
}

export function useYapometer() {
  return {
    calculateYapMetrics,
    calculateYapRate
  }
}
