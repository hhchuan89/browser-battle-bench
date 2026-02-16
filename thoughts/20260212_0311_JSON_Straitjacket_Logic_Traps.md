# Thought Log: JSON Straitjacket & Logic Traps Feasibility
**Date:** 2026-02-12 03:11
**Topic:** Feasibility & Implementation of Core "Hellish" Modules

## 1. Feasibility Analysis (WebGPU & Model Limits)

### JSON Straitjacket (The Compliance Test)
*   **Challenge:** Small, quantized in-browser models (e.g., Llama-3-8B-q4f16_1, Phi-3-mini) often struggle with strict syntax compliance over long contexts. They love to chatter before/after the JSON block.
*   **The "Strict" Constraint:**
    *   **Level 1 (Soft):** Prompt engineering ("Output ONLY JSON").
    *   **Level 2 (Hard):** Grammer-constrained decoding (Guidance/GBNF). *Feasibility Check:* Does WebLLM support custom grammar constraints robustly yet? If yes, this is the "Straitjacket". If no, we must implement a ruthless post-processor.
*   **Performance:** Generating tokens that match a regex/grammar is computationally cheaper than unconstrained sampling for the validation step, but setup might be heavy.

### Logic Traps (The Reasoning Test)
*   **Challenge:** "Logic Traps" require high reasoning capabilities. 4-bit quantized models often fail subtle logic not because of the "trap" but because they are just dumb.
*   **Differentiation:** We need to distinguish between "Model is stupid" vs "Model fell for the trap".
*   **Solution:** Use control questions. Ask a similar question *without* the trap first. If it passes control but fails trap => Successful Trap.

## 2. Implementation Path (Vue 3 + WebLLM)

### Stack Decision
*   **Frontend:** Vue 3 + Vite + Tailwind (Speed/Performance).
*   **Core:** `@mlc-ai/web-llm` for local inference.

### "JSON Straitjacket" Implementation Plan
1.  **Schema Definition:** Use `zod` to define the expected schema for each challenge.
2.  **The Validator (The "Judge"):**
    *   Receive stream.
    *   Attempt `JSON.parse()` on buffered chunks (streaming parser).
    *   **Kill Switch:** If the stream detects markdown prologues (`Here is the JSON...`) or non-JSON syntax at the start, immediate FAIL. No mercy.
    *   **Score:** 100/100 for valid JSON + Correct Content. 0/100 for syntax error.

### "Logic Traps" Data Structure
```typescript
interface LogicTrap {
  id: string;
  premise: string; // The misleading part
  question: string;
  control_question: string; // The sanity check
  expected_logic: string; // Key reasoning step required
}
```

## 3. Evolution & Pivot

*   **New Idea (Hardcore Mode):** "Streaming Guillotine".
    *   Instead of waiting for full output to validate JSON, we validate *token by token*.
    *   If a token violates the JSON syntax state machine, the generation is effectively killed instantly. The visual effect: The text turns red and stops. "WASTED".
*   **Cut/Deprioritize:**
    *   Don't build a custom "Scenario Builder" UI yet. Hardcode the first 10 levels.
    *   Don't support "Any Model" via generic OpenAI API for the *Straitjacket* specifically, because network latency ruins the "Streaming Guillotine" effect. Keep Straitjacket strictly Local/WebGPU for that visceral "instant fail" feel.

## 4. Next Steps
*   Prototype the `StreamingJSONParser` for the kill switch.
*   Select 3 initial logic traps from standard datasets (e.g., "Sally-Anne" variations with distractors).
