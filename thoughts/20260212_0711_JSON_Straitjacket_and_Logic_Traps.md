# Thought Log: JSON Straitjacket & Logic Traps Implementation
**Date:** 2026-02-12 07:11 AM
**Topic:** JSON Straitjacket (Strict Output) & Logic Traps (Reasoning Bench)

## 1. Feasibility Analysis (WebGPU & Small Models)

### The "JSON Straitjacket" Challenge
*   **Problem:** Small, quantized models (e.g., Llama-3-8B-q4, Phi-3-mini) running in-browser via WebLLM often struggle with strict schema adherence. They talk too much ("Here is the JSON you asked for...").
*   **WebLLM Constraints:** As of current knowledge, client-side grammar-constrained generation (like `llama.cpp` grammars) support in WebLLM is improving but might not be fully mature or performant for complex schemas yet.
*   **The "Straitjacket" Mechanic:**
    *   Instead of just asking, we treat "failure to parse" as an immediate **KO**.
    *   We can implement a client-side "JSON Healer" (like `json-repair`) purely to see *how broken* the output is, but the score depends on raw correctness.
    *   **Latency:** Retries on edge devices are painful (slow token generation). One-shot success is the only viable metric for a "Battle".

### Logic Traps
*   **Evaluation Difficulty:** How do we judge the answer to a logic trap without a backend LLM Judge?
*   **Solution:** **Deterministic Traps**.
    *   Use Multiple Choice Questions (MCQ) but with "Trap" options.
    *   Use "Exact String Match" requirements (e.g., "Reply with strictly the number only").
    *   *Risk:* Users might cheat by looking at client-side code/answers.
    *   *Mitigation:* It's a benchmark tool for *the user's* local model, cheating defeats the purpose. Encryption of answers is enough.

## 2. Implementation Path

### Stack Choice
*   **Framework:** **Vue 3 + Vite**. React is fine, but Vue's reactivity system feels slightly better for the real-time token streaming state management needed here.
*   **Engine:** `@mlc-ai/web-llm`.
*   **UI:** **Cyberpunk / Terminal style**. Low resource overhead, high "hacker" vibe.

### Module: JSON Straitjacket
1.  **Input:** A dynamic schema (e.g., Generate a User profile with `name`, `age`, `inventory` array).
2.  **Prompt Engineering:**
    *   System Prompt: "You are a JSON generator. Do not speak. Output raw JSON only."
    *   Prefill: Force the model to start with `{` by pre-injecting it into the assistant response start (if API allows) or just aggressive prompting.
3.  **Validation:** `zod` schema validation on the client.
4.  **Scoring:**
    *   100pts: Valid JSON, Schema match.
    *   50pts: Valid JSON, Schema mismatch.
    *   0pts: Invalid JSON.

### Module: Logic Traps
1.  **Data Structure:**
    ```json
    {
      "id": "trap_001",
      "prompt": "Bob has 3 apples...",
      "trap_type": "distraction",
      "expected_answer_regex": "^(0|zero)$"
    }
    ```
2.  **The "Trap":** Include "Red Herrings".
    *   *Example:* "If it takes 1 hour to dry 1 towel, how long to dry 10 towels?" (Trap: 10 hours vs 1 hour assuming parallel).

## 3. Evolution & Kill List

### 💡 New Ideas
*   **"Context Squeeze" (Needle in Haystack Lite):**
    *   Fill context with junk JSON data.
    *   Ask to retrieve one specific key.
    *   *Purpose:* Test browser memory limits and model attention span.
*   **"Stream Sniping":**
    *   Analyze the token stream *as it comes in*. If the model starts yapping ("Sure, I can..."), kill it immediately. "Too chatty."

### ☠️ Kill List (Deprioritized)
*   **"Code Nitpicking":**
    *   *Reasoning:* Validating code execution client-side is too complex (security risk with `eval()`, heavy with WebAssembly runtimes).
    *   *Verdict:* Cut for MVP. Focus on text/JSON logic first.

## 4. Next Steps
1.  Initialize Vue 3 project structure.
2.  Create `traps.json` dataset prototype.
3.  Test WebLLM with `json_mode` enforcement (if available) or strict prompting.
