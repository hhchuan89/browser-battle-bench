# Deep Think: JSON Straitjacket & Logic Traps
**Date:** 2026-02-12 02:11
**Topic:** Feasibility & Implementation of Core Benchmarks

## 1. Feasibility Analysis (可行性分析)

### JSON Straitjacket (JSON 拘束衣)
*   **Challenge:** Implementing "true" constrained decoding (Grammar-based sampling) in a pure browser environment via WebLLM/WebGPU is non-trivial. Most JS bindings for LLMs (like `web-llm`) focus on chat completion, not low-level logit manipulation.
*   **WebLLM Limitations:** Does the current `web-llm` engine support `response_format` strictly? If not, we are testing "Prompt Compliance" rather than "Constrained Decoding".
*   **Alternative:** The "Straitjacket" might need to be a "Compliance Score" rather than a hard technical constraint. We allow the model to fail, and if it outputs bad JSON, it gets a score penalty (or 0).
*   **Performance:** Loading Grammar files (GBNF) into the WASM runtime might add overhead.

### Logic Traps (逻辑陷阱)
*   **Feasibility:** High. Pure text-in/text-out.
*   **Grading Difficulty:** The hard part is *grading* the logic on the client side without a smarter "Judge" model.
    *   *Constraint:* We cannot assume the user has a local 70B model to act as a Judge. The runner *is* the test subject (often small 4B/8B models).
    *   *Solution:* The "Trap" answers must be deterministic (e.g., specific keywords, numbers, or short phrases) to allow Regex/String-match grading.

## 2. Implementation Path (实现路径)

### Tech Stack
*   **Framework:** **React + Vite**. (Vue is fine, but React's ecosystem for "Code Editor" components and JSON viewing is slightly richer for this specific niche).
*   **Engine:** `web-llm` (MLC) as the primary. `langchain.js` for orchestration (optional, might be bloat).

### Module: JSON Straitjacket
*   **Strategy:** "Retry & Punish" (重试与惩罚机制).
    1.  **Prompt:** System prompt explicitly defines Schema (using TypeScript interface syntax usually works best for small models).
    2.  **Validator:** Client-side `AJAX/Zod` schema validation.
    3.  **Loop:**
        *   Model generates.
        *   Parser checks `JSON.parse()`.
        *   Zod checks schema.
        *   *Fail?* Feed error back to model: "Error: Missing field 'id'. Fix it."
    4.  **Score:** `Score = 100 - (Retries * 20) - (Time taken)`. Perfect score requires valid JSON on shot #1.

### Module: Logic Traps
*   **Structure:**
    ```json
    {
      "question": "Sally's mother...",
      "expected_answer_regex": "(Sally|sally)",
      "trap_type": "distraction"
    }
    ```
*   **Execution:** Combine with JSON Straitjacket. Force the logic answer into a structured box.
    *   `{"thought_process": "...", "final_answer": "..."}`
    *   This separates the "reasoning" (which varies) from the "answer" (which we grade).

## 3. Evolution & Pivot (演进与取舍)

*   **New Idea: "Browser Blast" (Concurrency Test)**
    *   Instead of just one prompt, what happens if we fire 4 requests simultaneously to the WebGPU model?
    *   *Goal:* Test the queuing and VRAM management of the browser runtime. Does it crash the tab?
    *   *Status:* **Keep.** Good stress test.

*   **Pivot (Kill List):**
    *   **"Universal Model Judge" (本地裁判模型):**
        *   *Old Idea:* Load a second small model just to judge the first one.
        *   *Reason:* VRAM limits. Most user laptops (MacBook Air, typical PC) can barely hold one Quantized Llama-3-8B in VRAM. Loading a second one guarantees a crash or swap-death.
        *   *Change:* Rely on deterministic grading (Regex/Exact Match) or "Self-Correction" tests.

## 4. Next Steps
1.  Initialize a React project `browser-battle-bench-ui`.
2.  Create a "Straitjacket" prototype using `web-llm` minimal example.
3.  Test: Can Llama-3-8B-WebGPU output valid complex JSON without retries?
