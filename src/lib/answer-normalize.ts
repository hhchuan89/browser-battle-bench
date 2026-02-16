/**
 * Answer Normalization Utilities
 * Handles different types of answer validation and normalization
 */

export type NormalizationType =
  | 'exact'
  | 'number'
  | 'numeric_tolerance'
  | 'contains'
  | 'regex'
  | 'normalized_string'

export interface NormalizeOptions {
  type: NormalizationType
  tolerance?: number // For numeric_tolerance
  pattern?: string // For regex
  substring?: string // For contains
}

/**
 * Normalize answer based on type
 */
export function normalizeAnswer(
  answer: string,
  expected: string,
  options: NormalizeOptions
): boolean {
  const { type, tolerance, pattern, substring } = options

  switch (type) {
    case 'exact':
      return answer.trim().toLowerCase() === expected.trim().toLowerCase()

    case 'number': {
      const ansNum = parseFloat(answer.replace(/[^0-9.-]/g, ''))
      const expNum = parseFloat(expected.replace(/[^0-9.-]/g, ''))
      return !isNaN(ansNum) && !isNaN(expNum) && ansNum === expNum
    }

    case 'numeric_tolerance': {
      const ansNum = parseFloat(answer.replace(/[^0-9.-]/g, ''))
      const expNum = parseFloat(expected.replace(/[^0-9.-]/g, ''))
      const tol = tolerance ?? 0.01
      return !isNaN(ansNum) && !isNaN(expNum) && Math.abs(ansNum - expNum) <= tol
    }

    case 'contains':
      return answer.toLowerCase().includes((substring ?? expected).toLowerCase())

    case 'regex': {
      try {
        const regex = new RegExp(pattern ?? expected, 'i')
        return regex.test(answer)
      } catch {
        return false
      }
    }

    case 'normalized_string':
      return (
        answer
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') ===
        expected
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      )

    default:
      return false
  }
}

/**
 * Extract number from string
 */
export function extractNumber(value: string): number | null {
  const match = value.match(/-?\d+\.?\d*/)
  return match ? parseFloat(match[0]) : null
}

/**
 * Strip non-numeric characters
 */
export function stripNonNumeric(value: string): string {
  return value.replace(/[^0-9.-]/g, '')
}

/**
 * Check if string contains valid JSON
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

/**
 * Parse JSON safely
 */
export function safeJSONParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
