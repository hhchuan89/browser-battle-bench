import { ref, computed } from 'vue'
import { useYapometer } from './useYapometer'

export interface StreamValidationResult {
  isValid: boolean
  shouldGuillotine: boolean
  detectedPrefixes: string[]
  hasCodeBlock: boolean
  startsWithBrace: boolean
  whitespaceBufferFull: boolean
  yapRate: number
  charTimestamps: CharTimestamp[]
}

export interface CharTimestamp {
  char: string
  index: number
  timestamp: number
}

export interface UseStreamValidatorConfig {
  whitespaceBufferSize?: number // Default: 30 non-whitespace chars
  codeBlockMarkers?: string[]
  languagePrefixes?: string[]
}

const DEFAULT_CONFIG: UseStreamValidatorConfig = {
  whitespaceBufferSize: 30,
  codeBlockMarkers: ['```', '``', '`'],
  languagePrefixes: [
    'sure,',
    'here is',
    'here\'s',
    'of course',
    'certainly',
    'below is',
    'as requested',
    'here you go',
    'here\'s the',
    'the following',
    '```json',
    '```yaml',
    '```xml',
    '```html'
  ]
}

export interface UseStreamValidatorReturn {
  validateStream: (chunk: string) => StreamValidationResult
  shouldGuillotine: () => boolean
  getYapRate: () => number
  getCharTimestamps: () => CharTimestamp[]
  reset: () => void
  result: ReturnType<typeof ref<StreamValidationResult>>
}

/**
 * useStreamValidator Composable
 * Core responsibilities:
 * - Char-level detection (NOT token-based)
 * - Whitespace buffer: ignore until 30 non-whitespace chars
 * - First non-whitespace char must be `{`
 * - Detect Markdown code blocks
 * - Detect natural language prefixes
 * - Record char_timestamps every 50 chars
 */
export function useStreamValidator(
  config: UseStreamValidatorConfig = {}
): UseStreamValidatorReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  // Internal state
  const accumulated = ref('')
  const nonWhitespaceCount = ref(0)
  const detectedPrefixes = ref<string[]>([])
  const hasCodeBlock = ref(false)
  const startsWithBrace = ref(false)
  const whitespaceBufferFull = ref(false)
  const charTimestamps = ref<CharTimestamp[]>([])
  const totalChars = ref(0)
  const guillotined = ref(false)

  const { calculateYapRate } = useYapometer()

  const result = computed<StreamValidationResult>(() => ({
    isValid: startsWithBrace.value && !hasCodeBlock.value && detectedPrefixes.value.length === 0,
    shouldGuillotine: guillotined.value,
    detectedPrefixes: detectedPrefixes.value,
    hasCodeBlock: hasCodeBlock.value,
    startsWithBrace: startsWithBrace.value,
    whitespaceBufferFull: whitespaceBufferFull.value,
    yapRate: calculateYapRate(accumulated.value),
    charTimestamps: charTimestamps.value
  }))

  const reset = () => {
    accumulated.value = ''
    nonWhitespaceCount.value = 0
    detectedPrefixes.value = []
    hasCodeBlock.value = false
    startsWithBrace.value = false
    whitespaceBufferFull.value = false
    charTimestamps.value = []
    totalChars.value = 0
    guillotined.value = false
  }

  /**
   * Check if the accumulated text contains code block markers
   */
  const checkForCodeBlock = (text: string): boolean => {
    const lower = text.toLowerCase()
    return mergedConfig.codeBlockMarkers!.some(marker => lower.includes(marker))
  }

  /**
   * Check if text starts with natural language prefixes
   */
  const checkForPrefixes = (text: string): string[] => {
    const lower = text.toLowerCase().trim()
    const found: string[] = []
    
    for (const prefix of mergedConfig.languagePrefixes!) {
      if (lower.startsWith(prefix)) {
        found.push(prefix)
      }
    }
    
    return found
  }

  /**
   * Check if first non-whitespace character is opening brace
   */
  const checkStartsWithBrace = (text: string): boolean => {
    const trimmed = text.trim()
    return trimmed.length > 0 && trimmed[0] === '{'
  }

  /**
   * Record timestamp every 50 characters
   */
  const recordTimestamp = (char: string, index: number) => {
    if (index % 50 === 0) {
      charTimestamps.value.push({
        char,
        index,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Validate stream chunk
   * Returns validation result for each chunk
   */
  const validateStream = (chunk: string): StreamValidationResult => {
    // Accumulate the chunk
    accumulated.value += chunk
    totalChars.value += chunk.length

    // Check for code blocks
    if (!hasCodeBlock.value && checkForCodeBlock(accumulated.value)) {
      hasCodeBlock.value = true
    }

    // Track non-whitespace characters for buffer
    const nonWhitespaceInChunk = chunk.replace(/\s/g, '').length
    nonWhitespaceCount.value += nonWhitespaceInChunk

    // Check if whitespace buffer is full (30 non-whitespace chars)
    if (!whitespaceBufferFull.value && nonWhitespaceCount.value >= mergedConfig.whitespaceBufferSize!) {
      whitespaceBufferFull.value = true
      
      // Now check for valid JSON start
      const validPortion = accumulated.value.trim()
      startsWithBrace.value = checkStartsWithBrace(validPortion)
      
      // Check for language prefixes after buffer is full
      if (!startsWithBrace.value) {
        detectedPrefixes.value = checkForPrefixes(validPortion)
      }
    }

    // Record timestamps for every 50th char
    for (let i = 0; i < chunk.length; i++) {
      const globalIndex = totalChars.value - chunk.length + i
      recordTimestamp(chunk[i], globalIndex)
    }

    // Determine if should guillotine
    // Cut off if: has code block OR has prefix after buffer full AND doesn't start with brace
    const shouldCut = hasCodeBlock.value || 
      (whitespaceBufferFull.value && detectedPrefixes.value.length > 0 && !startsWithBrace.value)
    
    if (shouldCut && !guillotined.value) {
      guillotined.value = true
    }

    return result.value
  }

  /**
   * Determine if stream should be cut off
   */
  const shouldGuillotine = (): boolean => {
    return guillotined.value
  }

  /**
   * Get yap rate percentage
   */
  const getYapRate = (): number => {
    return calculateYapRate(accumulated.value)
  }

  /**
   * Get recorded character timestamps
   */
  const getCharTimestamps = (): CharTimestamp[] => {
    return charTimestamps.value
  }

  return {
    validateStream,
    shouldGuillotine,
    getYapRate,
    getCharTimestamps,
    reset,
    result
  }
}
