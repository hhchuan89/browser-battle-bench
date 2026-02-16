# 深度思考: JSON Straitjacket & Logic Traps
**Date:** 2026-02-12 06:11 AM
**Topic:** Browser Battle Bench - Technical Feasibility & Design

## 1. Feasibility (技术可行性)

### JSON Straitjacket (JSON 拘束衣)
*   **挑战 (The Challenge):** 在浏览器端 (WebGPU/WASM) 实现严格的 Grammar/Schema Constrained Decoding (受限解码) 极其消耗资源。
*   **WebLLM 现状:** 目前 `web-llm` 对 Logit Processor 的暴露有限。如果完全依赖 Prompt Engineering ("Please output JSON..."), 小模型 (Phi-3, Llama-3-8B-q4) 很容易崩。
*   **路径:**
    *   **方案 A (Hard):** 深入 `mlc-llm` 源码，看能否在 WASM 层注入 Grammar State Machine (类似 `llama.cpp` 的 GBNF)。这很难，且容易卡死 UI。
    *   **方案 B (Soft + Retry):** "混合拘束衣"。
        1.  System Prompt 强力约束。
        2.  Client-side Logit Bias (如果支持): 降低 `{` `}` `[` `]` 以外 token 的概率（极难调优）。
        3.  **主要手段:** `JSON.parse()` 失败后，立即触发 "Punishment Round" (惩罚轮) —— 把错误喂回给模型要求修正。记录修正次数作为 "Straitjacket Score"。修正 0 次完美，修正 3 次以上判负。

### Logic Traps (逻辑陷阱)
*   **挑战:** 如何自动化判定逻辑题的对错？
*   **路径:**
    *   不要让模型写长篇大论。
    *   **强制多选题 (Multiple Choice via JSON):**
        ```json
        { "analysis": "...", "verdict": "A" }
        ```
    *   判定逻辑简单粗暴：直接比对 `verdict`。
    *   **陷阱设计:** 题目必须设计成 "直觉选 A (错)，逻辑选 B (对)" 的对抗样本。

## 2. Implementation (实现路径)

### Tech Stack
*   **Framework:** Vue 3 + Pinia (状态管理极其重要，需要跟踪测试进度)。
*   **Engine:** `web-llm` (MLC AI)。
*   **UI Library:** Shadcn-vue (或者自写 Tailwind)，保持极简 "Lab" 风格。

### 核心代码结构 (Draft)

```typescript
// Interface for the "Torture Chamber"
interface BattleScenario {
  id: string;
  name: "JSON_STRAITJACKET_LEVEL_1";
  prompt: string;
  validator: (output: string) => number; // Returns score 0-100
}

// The Runner
async function runGauntlet(modelId: string, scenarios: BattleScenario[]) {
  const engine = await CreateMLCEngine(modelId, { initProgressCallback: updateLoading });
  
  for (const scenario of scenarios) {
    // 1. Load context
    // 2. Inference
    // 3. Client-side Validation (The "Straitjacket" check)
    try {
      const output = await engine.chat.completions.create({ ... });
      const json = JSON.parse(output.choices[0].message.content); // 💥 Explosion point
      // ... score calculation
    } catch (e) {
      // 💥 MODEL FAILED THE STRAITJACKET
      score = 0;
      failReason = "JSON_PARSE_ERROR"; 
    }
  }
}
```

## 3. Evolution (演进策略)

### 🔪 Kill (砍掉的想法)
*   **"实时多模型对战" (Simultaneous Battle):** 必须砍掉。浏览器 WebGPU 显存 (VRAM) 极其有限。同时跑两个 7B 模型会让用户的显卡直接崩溃或被系统杀进程。
*   **修正:** 改为 **"回合制闯关" (Gauntlet Mode)**。加载模型 A -> 跑分 -> 卸载 -> 加载模型 B。

### 💡 New Ideas (新点子)
*   **"The Panic Mode" (恐慌模式):** 
    *   监控 Token Generation Speed (TPS)。
    *   当遇到复杂逻辑陷阱时，如果 TPS 突然下降（模型在“犹豫”或内部计算量变大？其实通常是卡顿），UI 上显示心跳加速的动画。
*   **"Local God Mode" (本地上帝模式):**
    *   允许用户连接本地 Ollama 接口 (http://localhost:11434)。
    *   这样可以用本地 RTX 4090 的 70B 模型来 "碾压" 浏览器里的 3B 模型，形成鲜明对比。

## 4. Next Steps
1.  搭建 Vue 3 骨架。
2.  编写第一组 "JSON Straitjacket" 测试用例 (JSON Data)。
3.  集成 `web-llm` 简单跑通 Hello World。
