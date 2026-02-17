/**
 * JudgeLogic - JSON Answer Validator
 * 
 * Evaluates model responses against expected answers.
 * Extracts the answer field from JSON and compares it to the expected value.
 */

import type { AnswerType, JudgeEvaluateOptions } from '@/types/judge';

export interface JudgmentResult {
  /** Whether the answer is correct */
  pass: boolean;
  /** The parsed answer from the model (if extraction succeeded) */
  parsedAnswer?: string;
  /** Reason for failure (if pass is false) */
  reason?: string;
}

/**
 * Strips comments from JSON string (both single-line and multi-line styles)
 */
function stripComments(str: string): string {
  // Remove single-line comments
  let result = str.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

/**
 * Cleans JSON string of common formatting issues
 */
function cleanJsonString(str: string): string {
  return str
    .replace(/^\s*[\uFEFF\u200B]+/, '') // Remove BOM and zero-width spaces
    .replace(/\n\s*\/\/.*$/gm, '') // Remove trailing comments
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .trim();
}

export class JudgeLogic {
  /**
   * Evaluate a model's response
   * @param rawOutput - The raw text output from the model
   * @param expectedAnswer - The expected answer
   * @param options - Answer comparison mode settings
   * @returns JudgmentResult with pass/fail status
   */
  evaluate(
    rawOutput: string,
    expectedAnswer: string,
    options: JudgeEvaluateOptions = {}
  ): JudgmentResult {
    // Try to extract JSON from the output
    const jsonMatch = this.extractJson(rawOutput);
    
    if (!jsonMatch) {
      return {
        pass: false,
        reason: 'No valid JSON object found in response'
      };
    }

    // Parse the JSON
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch);
    } catch (e) {
      return {
        pass: false,
        reason: 'JSON parsing failed: ' + (e as Error).message
      };
    }

    // Check for answer field
    if (!('answer' in parsed)) {
      return {
        pass: false,
        parsedAnswer: JSON.stringify(parsed).substring(0, 100),
        reason: 'JSON missing required "answer" field'
      };
    }

    const parsedAnswer = String(parsed.answer).trim();
    const comparison = this.compareAnswers(parsed.answer, expectedAnswer, options);

    if (comparison.pass) {
      return { pass: true, parsedAnswer };
    }

    return {
      pass: false,
      parsedAnswer,
      reason: comparison.reason
    };
  }

  /**
   * Extract a JSON object from raw text
   * Handles cases where JSON might be embedded in markdown or other text
   */
  private extractJson(rawOutput: string): string | null {
    const trimmed = rawOutput.trim();
    
    // Clean the input first
    const cleaned = cleanJsonString(trimmed);
    
    // Try direct JSON parsing first
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      // Strip comments and validate
      const noComments = stripComments(cleaned);
      try {
        JSON.parse(noComments);
        return noComments;
      } catch {
        // Continue to other methods
      }
    }

    // Look for JSON inside markdown code blocks (with json tag)
    const jsonCodeBlockMatch = cleaned.match(/```json\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch) {
      const content = cleanJsonString(jsonCodeBlockMatch[1].trim());
      if (content.startsWith('{') && content.endsWith('}')) {
        const noComments = stripComments(content);
        try {
          JSON.parse(noComments);
          return noComments;
        } catch {
          // Continue
        }
      }
    }

    // Look for JSON inside generic code blocks
    const codeBlockMatch = cleaned.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const content = cleanJsonString(codeBlockMatch[1].trim());
      if (content.startsWith('{') && content.endsWith('}')) {
        const noComments = stripComments(content);
        try {
          JSON.parse(noComments);
          return noComments;
        } catch {
          // Continue
        }
      }
    }

    // Look for JSON object anywhere in the text (more permissive)
    // Find the outermost braces
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (cleaned[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonCandidate = cleaned.substring(startIndex, endIndex);
      const noComments = stripComments(jsonCandidate);
      try {
        JSON.parse(noComments);
        return noComments;
      } catch {
        // Continue
      }
    }

    return null;
  }

  private compareAnswers(
    parsedAnswer: unknown,
    expectedAnswer: string,
    options: JudgeEvaluateOptions
  ): { pass: boolean; reason?: string } {
    const answerType: AnswerType = options.answerType || 'exact';

    switch (answerType) {
      case 'exact':
        return this.compareExact(parsedAnswer, expectedAnswer);
      case 'number':
        return this.compareNumber(parsedAnswer, expectedAnswer);
      case 'numeric_tolerance':
        return this.compareNumberWithTolerance(
          parsedAnswer,
          expectedAnswer,
          options.tolerance ?? 0.01
        );
      case 'contains':
        return this.compareContains(parsedAnswer, expectedAnswer);
      case 'regex':
        return this.compareRegex(parsedAnswer, expectedAnswer);
      case 'normalized_string':
        return this.compareNormalizedString(parsedAnswer, expectedAnswer);
      default:
        return this.compareExact(parsedAnswer, expectedAnswer);
    }
  }

  private compareExact(
    parsedAnswer: unknown,
    expectedAnswer: string
  ): { pass: boolean; reason?: string } {
    const parsed = this.normalizeExact(parsedAnswer);
    const expected = this.normalizeExact(expectedAnswer);

    if (parsed === expected) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected "${expected}" but got "${parsed}"`
    };
  }

  private compareNumber(
    parsedAnswer: unknown,
    expectedAnswer: string
  ): { pass: boolean; reason?: string } {
    const parsed = this.extractFirstNumber(parsedAnswer);
    const expected = this.extractFirstNumber(expectedAnswer);

    if (parsed === null || expected === null) {
      return {
        pass: false,
        reason: `Numeric comparison failed: expected "${expectedAnswer}" got "${String(parsedAnswer)}"`
      };
    }

    if (parsed === expected) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected number "${expected}" but got "${parsed}"`
    };
  }

  private compareNumberWithTolerance(
    parsedAnswer: unknown,
    expectedAnswer: string,
    tolerance: number
  ): { pass: boolean; reason?: string } {
    const parsed = this.extractFirstNumber(parsedAnswer);
    const expected = this.extractFirstNumber(expectedAnswer);

    if (parsed === null || expected === null) {
      return {
        pass: false,
        reason: `Numeric tolerance comparison failed: expected "${expectedAnswer}" got "${String(parsedAnswer)}"`
      };
    }

    const diff = Math.abs(parsed - expected);
    if (diff <= tolerance) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected number within ±${tolerance} of "${expected}" but got "${parsed}" (diff ${diff.toFixed(4)})`
    };
  }

  private compareContains(
    parsedAnswer: unknown,
    expectedAnswer: string
  ): { pass: boolean; reason?: string } {
    const parsed = this.normalizeExact(parsedAnswer);
    const expected = this.normalizeExact(expectedAnswer);

    if (!expected) {
      return { pass: false, reason: 'Contains comparison failed: expected answer is empty' };
    }

    if (parsed.includes(expected)) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected output containing "${expected}" but got "${parsed}"`
    };
  }

  private compareRegex(
    parsedAnswer: unknown,
    expectedAnswer: string
  ): { pass: boolean; reason?: string } {
    const parsed = String(parsedAnswer).trim();
    const regex = this.buildRegex(expectedAnswer);

    if (!regex) {
      return { pass: false, reason: `Invalid regex pattern "${expectedAnswer}"` };
    }

    if (regex.test(parsed)) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected output matching regex "${expectedAnswer}" but got "${parsed}"`
    };
  }

  private compareNormalizedString(
    parsedAnswer: unknown,
    expectedAnswer: string
  ): { pass: boolean; reason?: string } {
    const parsed = this.normalizeNaturalString(String(parsedAnswer));
    const expected = this.normalizeNaturalString(expectedAnswer);

    if (parsed === expected) {
      return { pass: true };
    }

    return {
      pass: false,
      reason: `Expected normalized "${expected}" but got "${parsed}"`
    };
  }

  private normalizeExact(value: unknown): string {
    return String(value).trim().toLowerCase();
  }

  private normalizeNaturalString(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(a|an|the)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractFirstNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const match = String(value).replace(/,/g, '').match(/-?\d*\.?\d+/);
    if (!match) return null;

    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private buildRegex(pattern: string): RegExp | null {
    const trimmed = pattern.trim();
    const slashPattern = trimmed.match(/^\/(.+)\/([a-z]*)$/i);

    try {
      if (slashPattern) {
        return new RegExp(slashPattern[1], slashPattern[2]);
      }
      return new RegExp(trimmed, 'i');
    } catch {
      return null;
    }
  }

  /**
   * Validate that a response has the required JSON structure
   * Checks for both reasoning and answer fields
   */
  validateStructure(rawOutput: string): { valid: boolean; error?: string } {
    const jsonMatch = this.extractJson(rawOutput);
    
    if (!jsonMatch) {
      return { valid: false, error: 'No JSON object found' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch);
    } catch (e) {
      return { valid: false, error: 'Invalid JSON: ' + (e as Error).message };
    }

    const requiredFields = ['reasoning', 'answer'];
    const missingFields = requiredFields.filter(field => !(field in parsed));

    if (missingFields.length > 0) {
      return { 
        valid: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Extract reasoning from a JSON response
   */
  extractReasoning(rawOutput: string): string | null {
    const jsonMatch = this.extractJson(rawOutput);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch);
      return parsed.reasoning || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract answer from a JSON response
   */
  extractAnswer(rawOutput: string): string | null {
    const jsonMatch = this.extractJson(rawOutput);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch);
      return parsed.answer !== undefined ? String(parsed.answer) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Quick evaluation helper for simple use cases
 */
export function quickEvaluate(
  rawOutput: string,
  expectedAnswer: string,
  options: JudgeEvaluateOptions = {}
): boolean {
  const judge = new JudgeLogic();
  return judge.evaluate(rawOutput, expectedAnswer, options).pass;
}
