/**
 * JudgeLogic - JSON Answer Validator
 * 
 * Evaluates model responses against expected answers.
 * Extracts the answer field from JSON and compares it to the expected value.
 */

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
   * @param expectedAnswer - The expected answer (case-insensitive comparison)
   * @returns JudgmentResult with pass/fail status
   */
  evaluate(rawOutput: string, expectedAnswer: string): JudgmentResult {
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

    const parsedAnswer = String(parsed.answer).trim().toUpperCase();
    const expected = expectedAnswer.trim().toUpperCase();

    // Compare answers (case-insensitive)
    if (parsedAnswer === expected) {
      return {
        pass: true,
        parsedAnswer
      };
    } else {
      return {
        pass: false,
        parsedAnswer,
        reason: `Expected "${expected}" but got "${parsedAnswer}"`
      };
    }
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
export function quickEvaluate(rawOutput: string, expectedAnswer: string): boolean {
  const judge = new JudgeLogic();
  return judge.evaluate(rawOutput, expectedAnswer).pass;
}
