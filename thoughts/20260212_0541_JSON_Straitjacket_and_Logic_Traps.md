# 20260212_0541_JSON_Straitjacket_and_Logic_Traps

## 1. 核心命题：JSON 拘束衣与逻辑陷阱 (JSON Straitjacket & Logic Traps)

本次思考聚焦于 **Browser Battle Bench** 的两个核心测试维度：结构化输出能力的极限测试（拘束衣）与推理鲁棒性测试（逻辑陷阱）。

### 2. 可行性推演 (Feasibility Analysis)

#### A. JSON 拘束衣 (The JSON Straitjacket)
**技术难点：**
*   **端侧约束力不足：** 浏览器端的 WebLLM (MLC LLM) 目前对 Logits Processing（如 GBNF 语法约束）的支持不如服务器端 `llama.cpp` 成熟。完全依赖 Prompt Engineering 对于 4B/8B 这种量级的小模型来说，极其容易“破功”（Hallucination or Yapping）。
*   **评分标准：** 仅仅 `JSON.parse` 成功是不够的。小模型常犯错误包括：
    *   Markdown 包裹 (```json ... ```)。
    *   尾随逗号 (Trailing commas)。
    *   字段名幻觉 (Hallucinated keys)。
    *   无法闭合的大括号 (Truncated output)。

**解决方案推演：**
1.  **软约束 (Soft Constraint):** 强 System Prompt + Few-Shot Examples。
2.  **硬清洗 (Hard Cleaning):** 在评分器中内置 `json-repair` (或者自己写一个鲁棒的 parser)，计算“清洗成本”。
    *   *Score Formula:* `100 - (ParsingRetries * 10) - (HasMarkdownBlock ? 5 : 0) - (HasIntroText ? 20 : 0)`。
    *   **关键点：** 如果模型输出了 "Here is the JSON:"，直接扣大分。我们测的就是在这个“拘束衣”下，你能多老实。
3.  **Reflexion Loop:** 如果解析失败，把错误喂回给模型让它修。**这也是测试的一部分**：自我修正能力 (Self-Correction Capability)。

#### B. 逻辑陷阱 (Logic Traps)
**技术难点：**
*   **自动评分 (Auto-Grading) 的悖论：** 逻辑题通常是开放式的。如果我们要在纯前端（无昂贵 OpenAI API 作裁判）进行评分，如何判断模型“答对了”？
    *   *例子：* "树上有10只鸟，开枪打死1只，还剩几只？" 回答可能是 "0"（吓跑了），也可能是 "9"（如果不跑），或者是 "1"（死的那只）。

**解决方案推演：**
1.  **确定性锚点 (Deterministic Anchors):**
    *   设计必须包含特定**关键词**或**数值**的陷阱。
    *   例如：要求输出必须符合正则表达式 `^Answer: \d+$`。
2.  **多选题变种 (Multiple Choice Variants):**
    *   将逻辑陷阱包装成 JSON 格式的多选题。结合“拘束衣”一起测。
    *   *Double Kill:* 既测格式，又测逻辑。
    *   `{ "reasoning": "...", "choice": "B" }` —— 强迫模型先思考 (CoT) 再选，然后只 regex 匹配 `choice`。

### 3. 实现路径 (Implementation Path)

**技术栈决策：**
*   **Framework:** React + Vite (生态最丰富，方便找现成的 JSON Viewer 组件)。
*   **Engine:** `@mlc-ai/web-llm`。
*   **Worker:** 必须把 LLM 放在 Web Worker 里，否则推理时 UI 会卡死，无法渲染实时的“掉血/扣分”动画。

**MVP 代码思路 (The Gauntlet):**

```typescript
// 类型定义：一个测试关卡
interface BattleStage {
  id: string;
  systemPrompt: string; // 比如 "You are a JSON-only machine."
  userPrompt: string;   // 逻辑陷阱题
  schema: ZodSchema;    // 预期结构的 Zod 定义
  forbiddenTerms: string[]; // 禁止出现的词（如 "Here is..."）
}

// 核心评分逻辑
async function evaluateResponse(output: string, stage: BattleStage) {
  let score = 100;
  
  // 1. 废话检测 (Yapping Penalty)
  if (!output.startsWith('{') && !output.startsWith('[')) {
    score -= 20; // 废话扣分
  }
  
  // 2. 结构提取
  const jsonString = extractJson(output); // 尝试提取
  
  // 3. 解析与校验
  try {
    const data = JSON.parse(jsonString);
    const validation = stage.schema.safeParse(data);
    if (!validation.success) {
      score -= 50; // 结构不对，重罚
      return { score, error: "Schema Mismatch" };
    }
    
    // 4. 逻辑校验 (Logic Check) - 针对特定的题
    if (stage.id === 'trap-birds' && data.answer !== 0) {
      score -= 100; // 逻辑错误
    }
  } catch (e) {
    score = 0; // 连 JSON 都不是，直接抬走
  }
  
  return score;
}
```

### 4. 演进与决策 (Evolution & Decision)

*   **New Idea (保留):** **"The Yapping Meter" (废话计量器)**。在 UI 上做一个实时的进度条，模型每输出一个非 JSON 字符，进度条就涨，红了就直接 Kill 掉当前生成。视觉效果极佳。
*   **Kill Idea (砍掉):** 暂时不要做“代码执行沙箱”。在浏览器里搞 Python/JS 代码执行环境太重了，且容易被模型生成的恶意死循环搞崩页面。MVP 阶段专注于 **Text/JSON/Logic**。

### 5. 下一步行动 (Next Steps)
1.  搭建 React + WebLLM 基础脚手架。
2.  编写第一组 "JSON Straitjacket" 测试题（5个不同难度的 JSON Schema）。
3.  设计 "Yapping Meter" 的 UI 原型。
