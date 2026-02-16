# Deep Think: JSON Straitjacket & Logic Traps
**Date:** 2026-02-12 04:41
**Topic:** Feasibility & Implementation of "JSON Straitjacket" and "Logic Traps"

## 1. Feasibility Analysis (可行性分析)

### JSON Straitjacket (JSON 拘束衣)
**The Core Challenge:** Small quantized models (Llama-3-8B-q4f16_1, Phi-3, etc.) running in WebLLM often struggle with "Stop Tokens" or pure output. They love to "yap" (e.g., "Here is the JSON you requested:").

*   **Constraint Tech:**
    *   **WebLLM Grammar Support:** Does MLC-LLM/WebLLM expose GBNF (Grammar-Based Normalization Form) or LogitProcessor yet?
        *   *Check:* WebLLM recently added support for structured generation constraints (JSON schema enforcement) via logit processing. This is feasible.
    *   **Validation:** pure `JSON.parse()` is too binary.
        *   *Better approach:* A "Parser Severity" slider.
        *   **Hardcore Mode:** `JSON.parse(raw_output)` -> Fails if any whitespace/markdown is outside.
        *   **Lenient Mode:** Regex extract `\{.*\}` or ```json ... ``` blocks first.
    *   **Performance:** Generating complex JSON schemas increases inference time slightly due to logit masking, but acceptable on WebGPU.

### Logic Traps (逻辑陷阱)
**The Core Challenge:** Deterministic grading without a "Judge Model". We don't want to load *two* models (Solver + Judge) on a user's GPU; that will OOM (Out Of Memory) instantly on consumer hardware.

*   **Solution:** Strict Keyword Matching (Regex).
*   **Trap Design:** Questions must have *specific* keywords that indicate failure (the trap) and success (the truth).
    *   *Q:* "Who is the CEO of Twitter?"
    *   *Trap keyword:* "Jack Dorsey", "Parag Agrawal".
    *   *Correct keyword:* "Elon Musk", "Linda Yaccarino" (depending on date cutoff knowledge).
    *   *Note:* Time-sensitive logic traps are dangerous. Stick to logical invariants (math, riddles).

## 2. Implementation Path (实现路径)

### Tech Stack Selection
*   **Framework:** **Vue 3 + Vite**. (Lightweight, reactive state management perfect for the "Console" UI).
*   **Engine:** **WebLLM** (MLC-LLM) for local WebGPU inference.
*   **UI Library:** **Tailwind CSS** (Hand-crafted "Battle Arena" aesthetics). No heavy component libraries.

### Phase 1: The "JSON Straitjacket" Module
**Code Logic (Pseudo-Vue):**

```typescript
// The Test Case
interface JsonTest {
  level: number;
  description: string;
  schema: object; // Zod or JSON Schema
}

// The Runner
async function runStraitjacket(model: Engine, test: JsonTest) {
  const prompt = `You are a JSON engine. Output ONLY valid JSON matching this schema: ${JSON.stringify(test.schema)}.`;
  
  // WebLLM generation
  const response = await model.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    // Critical: If WebLLM supports 'response_format' (OpenAI compat), use it!
    response_format: { type: "json_object" } 
  });

  const raw = response.choices[0].message.content;
  
  // The Grading
  try {
    const parsed = JSON.parse(raw);
    // Validate against schema
    return validateSchema(parsed, test.schema) ? "PASS" : "SCHEMA_MISMATCH";
  } catch (e) {
    return "PARSE_ERROR"; // The "Straitjacket" broke the model
  }
}
```

### Phase 2: Logic Traps Dataset
Format for `traps.json`:

```json
[
  {
    "id": "trap_001",
    "prompt": "If you dig a hole 2 meters deep, how much dirt is inside?",
    "trap_regex": "(2|two|meters|cubic)", 
    "success_regex": "(none|zero|no dirt|empty)",
    "explanation": "Holes are empty."
  }
]
```

## 3. Evolution & Kill List (进化与砍树)

### 💡 New Ideas (Evolution)
*   **"The Hallucination Meter":** Inject a non-existent CSS property or API method into a coding question. See if the model confidently uses it or corrects it.
*   **"OOM Chicken":** Progressively load larger context until the browser crashes or the model degrades. (Maybe too dangerous/annoying for users? Mark as "Experimental").

### 🔪 Kill List (To Abandon)
*   **Kill:** "Multi-Agent Arena" (Two models talking to each other).
    *   *Reason:* Browser tab will crash. VRAM cannot handle two loaded weights (e.g., Llama-3 + Gemma) simultaneously unless they are tiny. Keep it single-player for now.
*   **Kill:** "RAG Testing".
    *   *Reason:* Requires embedding models + vector DB (wasm). Too much complexity for MVP. Focus on *Reasoning* and *Format* first.

## 4. Next Action
*   Initialize Vue project structure.
*   Create a simple `benchmarks/json_straitjacket.ts` file with 5 levels of difficulty.
