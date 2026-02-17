import { ref } from 'vue'
import { z } from 'zod'
import type { StreamValidationResult } from './useStreamValidator'
import { useZodValidator } from './useZodValidator'

export interface ScoreBreakdown {
  formatCompliance: number      // 35%
  fieldCompleteness: number    // 25%
  responseEfficiency: number   // 20%
  schemaPurity: number          // 10%
  ttft: number                  // 10%
}

export interface ScoredResponse {
  totalScore: number
  breakdown: ScoreBreakdown
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface UseScorerOptions {
  weights?: Partial<ScoreBreakdown>
}

const DEFAULT_WEIGHTS: ScoreBreakdown = {
  formatCompliance: 35,
  fieldCompleteness: 25,
  responseEfficiency: 20,
  schemaPurity: 10,
  ttft: 10
}

export interface UseScorerReturn {
  calculateScore: (
    validationResult: StreamValidationResult,
    responseText: string,
    schema: z.ZodSchema,
    ttft: number // Time to first token in ms
  ) => ScoredResponse
  getDetailedScores: () => ScoreBreakdown
  setWeights: (weights: Partial<ScoreBreakdown>) => void
}

/**
 * useScorer Composable
 * 
 * Scoring Weights (from master plan):
 * - Format Compliance: 35%
 * - Field Completeness: 25%
 * - Response Efficiency (yap): 20%
 * - Schema Purity: 10%
 * - TTFT: 10%
 */
export function useScorer(options: UseScorerOptions = {}): UseScorerReturn {
  const weights = ref<ScoreBreakdown>({ ...DEFAULT_WEIGHTS, ...options.weights })
  const lastScores = ref<ScoreBreakdown | null>(null)
  const { safeParseJson, getRequiredFields, getMissingFields, getExtraFields } = useZodValidator()

  /**
   * Calculate format compliance score
   * Based on: starts with brace, no code blocks, no prefixes
   */
  const calculateFormatCompliance = (validationResult: StreamValidationResult): number => {
    let score = 100
    
    if (!validationResult.startsWithBrace) {
      score -= 50 // Doesn't start with {
    }
    
    if (validationResult.hasCodeBlock) {
      score -= 30 // Contains code blocks
    }
    
    if (validationResult.detectedPrefixes.length > 0) {
      score -= 20 * Math.min(validationResult.detectedPrefixes.length, 3) // Has prefixes
    }
    
    return Math.max(0, score)
  }

  /**
   * Calculate field completeness
   * Parse JSON and check required fields
   */
  const calculateFieldCompleteness = (
    responseText: string,
    schema: z.ZodSchema
  ): number => {
    const parsed = safeParseJson(responseText)
    if (!parsed.ok) return 0

    const requiredFields = getRequiredFields(schema)
    if (requiredFields.length === 0) return 100

    const missingFields = getMissingFields(parsed.value, schema)
    return ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
  }

  /**
   * Calculate response efficiency (yap penalty)
   * Lower yap = higher score
   */
  const calculateResponseEfficiency = (yapRate: number): number => {
    // yapRate is percentage of non-JSON content
    // Score = 100 - yapRate (capped at reasonable max)
    return Math.max(0, 100 - yapRate)
  }

  /**
   * Calculate schema purity
   * Does response strictly follow schema (no extra fields)?
   */
  const calculateSchemaPurity = (
    responseText: string,
    schema: z.ZodSchema
  ): number => {
    const parsed = safeParseJson(responseText)
    if (!parsed.ok) return 0

    const extraFields = getExtraFields(parsed.value, schema)
    if (extraFields.length === 0) return 100

    return Math.max(0, 100 - (extraFields.length * 25))
  }

  /**
   * Calculate TTFT score
   * Faster = better (capped at 10 seconds for 0 score)
   */
  const calculateTTFTScore = (ttft: number): number => {
    const maxTTFT = 10000 // 10 seconds = 0 score
    return Math.max(0, 100 - (ttft / maxTTFT) * 100)
  }

  /**
   * Calculate total score
   */
  const calculateScore = (
    validationResult: StreamValidationResult,
    responseText: string,
    schema: z.ZodSchema,
    ttft: number
  ): ScoredResponse => {
    const errors: string[] = []
    const warnings: string[] = []

    // Calculate individual scores
    const formatCompliance = calculateFormatCompliance(validationResult)
    const fieldCompleteness = calculateFieldCompleteness(responseText, schema)
    const responseEfficiency = calculateResponseEfficiency(validationResult.yapRate)
    const schemaPurity = calculateSchemaPurity(responseText, schema)
    const ttftScore = calculateTTFTScore(ttft)

    // Collect errors
    if (!validationResult.startsWithBrace && validationResult.whitespaceBufferFull) {
      errors.push('Response does not start with opening brace {')
    }
    if (validationResult.hasCodeBlock) {
      errors.push('Response contains code block markers')
    }
    if (validationResult.detectedPrefixes.length > 0) {
      warnings.push(`Detected language prefixes: ${validationResult.detectedPrefixes.join(', ')}`)
    }

    // Calculate weighted total
    const totalWeight = Object.values(weights.value).reduce((a, b) => a + b, 0)
    
    const breakdown: ScoreBreakdown = {
      formatCompliance,
      fieldCompleteness,
      responseEfficiency,
      schemaPurity,
      ttft: ttftScore
    }

    lastScores.value = breakdown

    const totalScore = (
      (formatCompliance * weights.value.formatCompliance) +
      (fieldCompleteness * weights.value.fieldCompleteness) +
      (responseEfficiency * weights.value.responseEfficiency) +
      (schemaPurity * weights.value.schemaPurity) +
      (ttftScore * weights.value.ttft)
    ) / totalWeight

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown,
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get detailed scores from last calculation
   */
  const getDetailedScores = (): ScoreBreakdown => {
    return lastScores.value || {
      formatCompliance: 0,
      fieldCompleteness: 0,
      responseEfficiency: 0,
      schemaPurity: 0,
      ttft: 0
    }
  }

  /**
   * Update scoring weights
   */
  const setWeights = (newWeights: Partial<ScoreBreakdown>) => {
    weights.value = { ...weights.value, ...newWeights }
  }

  return {
    calculateScore,
    getDetailedScores,
    setWeights
  }
}
