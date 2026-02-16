export class StreamGuillotine {
  /**
   * Checks the accumulated stream text for violations.
   * @param fullTextSoFar The complete text generated so far.
   */
  check(fullTextSoFar: string): { valid: boolean; reason?: string } {
    const trimmed = fullTextSoFar.trimStart();

    // Rule 1: First non-whitespace char MUST be '{'.
    if (trimmed.length > 0) {
      if (trimmed[0] !== '{') {
        return {
          valid: false,
          reason: "Response must start with JSON object '{'. Markdown preamble is forbidden.",
        };
      }
    }

    // Rule 2: MUST NOT contain "```" (markdown code fence).
    if (fullTextSoFar.includes('```')) {
      return {
        valid: false,
        reason: "Markdown code fences '```' are strictly forbidden. Output raw JSON only.",
      };
    }

    return { valid: true };
  }
}
