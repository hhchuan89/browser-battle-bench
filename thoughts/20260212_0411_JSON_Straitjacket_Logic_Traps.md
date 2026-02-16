# 20260212_0411_JSON_Straitjacket_Logic_Traps

**Focus:** JSON Straitjacket & Logic Traps Feasibility Analysis
**Time:** 2026-02-12 04:11 AM

## 1. Feasibility Analysis (可行性)

### JSON Straitjacket (JSON 拘束衣)
*   **挑战:** Web端侧模型（通常是 4B/8B 量化版）通常指令遵循能力较弱，容易输出多余的 "Here is the JSON:" 前缀或 Markdown 代码块标记。
*   **WebLLM 限制:** 需要确认 WebLLM 的 JS SDK 是否完整支持 `response_format` 或 `grammar` 参数。如果支持，这变成了“框架能力测试”而非“模型智力测试”。
*   **竞技场定位:** 为了体现“Battle”的残酷性，我们应该分两层测试：
    *   **Raw Mode:** 仅通过 Prompt 约束，看模型能否“自觉”输出纯 JSON。这对 8B 以下模型是极难的考验（真正的地狱）。
    *   **Guided Mode:** 启用 Logit 约束/Grammar，测试生成速度和有效性。

### Logic Traps (逻辑陷阱)
*   **评分难题:** 在纯客户端环境，没有“上帝模型”来裁判开放式回答。
*   **解决方案:** 必须将“逻辑陷阱”转化为**确定性输出**。
    *   例如：选择题 (A/B/C)。
    *   或者：要求输出特定的短语作为 Key (e.g., `{"culprit": "The Butler"}`).

## 2. Implementation Path (实现路径)

### Tech Stack
*   **Core:** React (推荐，因其状态管理适合处理复杂的测试流程状态机) + Vite。
*   **Engine:** `@mlc-ai/web-llm`。

### JSON Straitjacket - 代码思路
```typescript
// Define a brutal schema
const challengeSchema = {
  type: "object",
  properties: {
    analysis: { type: "string" },
    confidence: { type: "number" },
    flags: { type: "array", items: { type: "string" } }
  },
  required: ["analysis", "confidence", "flags"]
};

// Strict Validator
function validateResponse(rawOutput) {
  try {
    const json = JSON.parse(rawOutput); // Must fail if markdown blocks exist
    // ... schema validation ...
    return { success: true };
  } catch (e) {
    return { success: false, error: "JSON_PARSE_FAIL" }; // The "Straitjacket" squeezes too hard
  }
}
```

### Logic Traps - 题库设计
*   **Trap 1: 假前提 (False Premise)**
    *   Q: "When did Neil Armstrong step on Mars?"
    *   Expected JSON: `{"event_happened": false, "correction": "Moon"}`
    *   Trap: Weak models might hallucinate a date.

## 3. Evolution (演进与删减)

*   **New Idea:** **"The Sanitizer" Pipeline**
    *   在 JSON 拘束衣测试中，加入一个前处理步骤：允许模型输出 Markdown，然后用正则提取。
    *   **对比测试:** 直出 JSON vs. 正则提取 JSON。计算“额外Token浪费率”。如果模型非要啰嗦，它在“效率榜”上就会得分低。
*   **Kill Idea:** **完全开放式问答**
    *   太复杂了，砍掉。纯前端没法做高质量的语义相似度匹配（Embedding 模型加载又大又慢），除非引入 WebGPU 的 Embedding 模型，但那会显著增加首屏加载时间。MVP 阶段砍掉。

## 4. Summary
*   **重点:** 将测试转化为“确定性输出”是纯前端 Bench 的关键。
*   **下一步:** 先写一个简单的 React Demo，跑通 WebLLM 加载 Llama-3-8B，测试 Prompt 对 JSON 的约束力。
