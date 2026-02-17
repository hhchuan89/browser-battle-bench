import { CreateWebWorkerMLCEngine, type MLCEngineInterface, type InitProgressCallback } from "@mlc-ai/web-llm";

// Hardcoded model for testing
const SELECTED_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export class LLMEngine {
  private engine: MLCEngineInterface | null = null;
  private currentModelId: string | null = null;
  private static instance: LLMEngine;

  private constructor() {}

  public static getInstance(): LLMEngine {
    if (!LLMEngine.instance) {
      LLMEngine.instance = new LLMEngine();
    }
    return LLMEngine.instance;
  }

  private resolveModelId(modelId?: string): string {
    return modelId ?? this.currentModelId ?? SELECTED_MODEL;
  }

  public async initialize(onProgress: InitProgressCallback, modelId?: string): Promise<void> {
    const resolvedModel = this.resolveModelId(modelId);
    if (this.engine && this.currentModelId === resolvedModel) return;

    try {
      if (this.engine && this.currentModelId !== resolvedModel) {
        this.engine = null;
      }

      // Create a new worker
      const worker = new Worker(
        new URL('../../workers/llm.worker.ts', import.meta.url), 
        { type: 'module' }
      );

      this.engine = await CreateWebWorkerMLCEngine(
        worker,
        resolvedModel,
        {
          initProgressCallback: onProgress,
          logLevel: "INFO",
        }
      );
      this.currentModelId = resolvedModel;
      console.log("WebWorker Engine initialized successfully");
    } catch (error) {
      console.error("Failed to initialize engine:", error);
      throw error;
    }
  }

  public async generate(prompt: string, onUpdate: (partial: string) => void): Promise<string> {
    if (!this.engine) throw new Error("Engine not initialized");

    const messages = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: prompt }
    ];

    const reply = await this.engine.chat.completions.create({
      messages: messages as any,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of reply) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
      onUpdate(content);
    }
    return fullResponse;
  }

  public async interruptGenerate() {
    if (this.engine) {
      await this.engine.interruptGenerate();
    }
  }
}
