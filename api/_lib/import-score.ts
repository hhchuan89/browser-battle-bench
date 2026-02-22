import type { ImportBbbReportFile, ImportRawOutputsFile, ImportScoreResult } from './import-contracts.js'
import { getSupportedScenarioMap, resolveImportScenario } from './import-scenario-map.js'

export interface ImportScoreDiagnostics {
  expected_tests: number
  observed_outputs: number
  matched_outputs: number
  missing_test_ids: string[]
  unknown_test_ids: string[]
}

const gradeFromScore = (score: number): ImportScoreResult['grade'] => {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'F'
}

const normalizeAnswer = (value: string): string => value.trim().toUpperCase()

const tryParseJson = (candidate: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(candidate)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const extractFirstJsonObject = (raw: string): string | null => {
  let depth = 0
  let start = -1

  for (let idx = 0; idx < raw.length; idx += 1) {
    const char = raw[idx]
    if (char === '{') {
      if (depth === 0) start = idx
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        return raw.slice(start, idx + 1)
      }
    }
  }

  return null
}

const extractAnswer = (rawOutput: string): string | null => {
  const trimmed = String(rawOutput || '').trim()
  if (!trimmed) return null

  const direct = tryParseJson(trimmed)
  if (direct && typeof direct.answer !== 'undefined') {
    return normalizeAnswer(String(direct.answer))
  }

  const blockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (blockMatch?.[1]) {
    const fromBlock = tryParseJson(blockMatch[1].trim())
    if (fromBlock && typeof fromBlock.answer !== 'undefined') {
      return normalizeAnswer(String(fromBlock.answer))
    }
  }

  const firstJson = extractFirstJsonObject(trimmed)
  if (firstJson) {
    const fromFirst = tryParseJson(firstJson)
    if (fromFirst && typeof fromFirst.answer !== 'undefined') {
      return normalizeAnswer(String(fromFirst.answer))
    }
  }

  const regexMatch = trimmed.match(/"answer"\s*:\s*"([^"]+)"/i)
  if (regexMatch?.[1]) {
    return normalizeAnswer(regexMatch[1])
  }

  return null
}

export const scoreImportedRun = (input: {
  bbb_report: ImportBbbReportFile
  bbb_raw_outputs: ImportRawOutputsFile
}): { score: ImportScoreResult; diagnostics: ImportScoreDiagnostics } => {
  const scenario = resolveImportScenario(input.bbb_report)
  const answerKey = getSupportedScenarioMap()[scenario.scenario_id]
  if (!answerKey) {
    throw new Error(`No answer key found for scenario ${scenario.scenario_id}`)
  }

  const outputsByTestId = new Map<string, string>()
  for (const entry of input.bbb_raw_outputs.raw_outputs) {
    if (!outputsByTestId.has(entry.test_id)) {
      outputsByTestId.set(entry.test_id, entry.output)
    }
  }

  let passed = 0
  const missing: string[] = []
  const unknown: string[] = []

  for (const [testId, expectedAnswer] of Object.entries(answerKey.answers)) {
    const rawOutput = outputsByTestId.get(testId)
    if (!rawOutput) {
      missing.push(testId)
      continue
    }

    const parsedAnswer = extractAnswer(rawOutput)
    if (parsedAnswer && parsedAnswer === normalizeAnswer(expectedAnswer)) {
      passed += 1
    }
  }

  for (const observedTestId of outputsByTestId.keys()) {
    if (!answerKey.answers[observedTestId]) {
      unknown.push(observedTestId)
    }
  }

  const totalRounds = Object.keys(answerKey.answers).length
  const passRate = totalRounds > 0 ? (passed / totalRounds) * 100 : 0
  const normalizedPassRate = Math.round(passRate * 100) / 100

  return {
    score: {
      mode: scenario.mode,
      scenario_id: scenario.scenario_id,
      scenario_name: scenario.scenario_name,
      score: normalizedPassRate,
      grade: gradeFromScore(normalizedPassRate),
      pass_rate: normalizedPassRate,
      total_rounds: totalRounds,
      passed_rounds: passed,
    },
    diagnostics: {
      expected_tests: totalRounds,
      observed_outputs: outputsByTestId.size,
      matched_outputs: passed,
      missing_test_ids: missing,
      unknown_test_ids: unknown,
    },
  }
}
