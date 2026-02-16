# 2026-02-12: JSON Straitjacket & Logic Traps Feasibility Analysis

**Time:** 2026-02-12 05:11 AM
**Topic:** JSON Straitjacket (JSON 拘束衣) & Logic Traps (逻辑陷阱)
**Status:** Deep Think (深度思考)

---

## 1. Feasibility (可行性分析)

### The "JSON Straitjacket" Challenge
**Goal:** Force small, quantized browser models (e.g., Llama-3-8B-q4f16_1, RedPajama) to output strictly valid JSON, down to the comma.
**Technical Hurdle:**
- **Grammar Support in WebLLM:** Most browser-based inference engines (WebLLM, Transformers.js) are optimized for speed, not control. They often lack the sophisticated `logits_processor` or grammar-based sampling (like `llama.cpp`'s GBNF) needed to *guarantee* JSON.
- **Without Grammar:** Relying purely on prompt engineering ("You are a JSON machine...") with 4-bit quantized models is risky. They hallucinate keys or add conversational filler ("Here is your JSON: ...").
- **Solution Path:**
    1. **Check WebLLM API:** Does it expose a `logit_processor`? If yes, port a simple JSON-schema mask.
    2. **Fallback:** Use a "Repair & Retry" loop. If `JSON.parse()` fails, feed the error back to the model for one retry. If still fail, score = 0.
    3. **Regex Enforcer:** If we can intercept token generation, strictly ban tokens that violate JSON syntax (e.g., no letters after a closing brace `}`).

### The "Logic Trap" Challenge
**Goal:** Trick the model with misleading premises.
**Technical Hurdle:**
- **Quantization Brain Damage:** 4-bit models often lose subtle reasoning capabilities. They might fail "Logic Traps" not because they were tricked, but because they simply aren't smart enough to track the logic.
- **Differentiation:** We need to distinguish between "Dumb" (model failed to reason) and "Trapped" (model fell for the specific bait).
- **Solution Path:**
    - **Control Questions:** Pair every "Trap" with a "Control" question (same structure, no trap). If it fails Control, it's too dumb. If it passes Control but fails Trap, the trap worked.

---

## 2. Implementation (实现路径)

### Tech Stack
- **Framework:** **Vue 3** + **Tailwind CSS**. (React is fine, but Vue's reactivity is nicer for streaming logs).
- **Engine:** **WebLLM** (MLC AI) for browser-native execution.
- **Backend:** None (Static site via GitHub Pages / Vercel).

### The "Straitjacket" Protocol (Draft Code Logic)
```typescript
interface StraitjacketConfig {
  schema: object; // The JSON Schema to enforce
  maxRetries: number; // 0 for "Hardcore Mode"
}

async function runStraitjacket(prompt: string, config: StraitjacketConfig) {
  // 1. Construct System Prompt
  const systemMsg = `You are a strict JSON generator. adhere to this schema: ${JSON.stringify(config.schema)}`;
  
  // 2. Inference
  const output = await engine.chat.completions.create({
    messages: [{ role: "system", content: systemMsg }, { role: "user", content: prompt }],
    // If WebLLM adds 'response_format': { type: 'json_object' }, use it!
  });

  // 3. Validation
  try {
    const json = JSON.parse(output.choices[0].message.content);
    // Validate against Schema (Zod or Ajv)
    return validateSchema(json, config.schema); 
  } catch (e) {
    return { success: false, error: "Invalid JSON", raw: output };
  }
}
```

### The "Logic Trap" Structure
Data structure for benchmarks:
```json
{
  "id": "trap_001",
  "category": "logic_trap",
  "premise": "Sally has 3 brothers. Each brother has 2 sisters. How many sisters does Sally have?",
  "trap_type": "lateral_thinking",
  "expected_answer": 1, // Herself (assuming simpler interpretation) or 0 (siblings exclude self? No, sisters implies relationship).
  // Actually: If she has brothers, and those brothers have sisters...
  // Wait, if Sally is a girl, she is a sister.
  // Trap: People multiply 3 * 2 = 6. 
  // Correct: The sisters are shared. It's Sally + maybe another? 
  // "Each brother has 2 sisters" -> The set of sisters is size 2.
  // So Sally + 1 other sister. Total 2.
  // This needs precise wording to be a valid benchmark.
}
```

---

## 3. Evolution (演进与取舍)

### KILL (砍掉)
- **Complex 3D Visualizations:** No WebGL arenas. Just text logs and progress bars. The browser is already melting from the LLM; don't add 3D rendering overhead.
- **Mobile Support:** Forget it. 8B parameters on a phone browser is a heat death sentence. Focus on Desktop Chrome/Edge first.

### KEEP (保留)
- **Local API Support:** Allow users to connect to a local Ollama instance (`http://localhost:11434`). This provides a "Control Group" (High-performance local execution) vs. "Experimental Group" (Browser execution).
- **"Sudden Death" Mode:** In Straitjacket mode, if a single comma is missing, the screen flashes red and the run terminates immediately. High stakes.

### NEW IDEA (新点子)
- **"The Mirror Test":** Ask the model to generate a prompt that would trick *itself*. Then feed that prompt back in. (Might be too complex for V1).
- **"Token Golf":** Can the model answer the question correctly in the *fewest tokens possible*? (Efficiency metric).

---

## Summary
Focus on building the **"Straitjacket Engine"** first. If we can't reliably test strict JSON compliance in a browser environment, the rest of the arena falls apart. 
**Action Item:** Prototype a simple WebLLM page that asks for a JSON object and validates it.
