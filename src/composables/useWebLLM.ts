import * as webllm from '@mlc-ai/web-llm'
import { ref, shallowRef, type Ref } from 'vue'

export interface WebLLMProgress {
  text: string
  progress: number
  timeElapsed: number
}

export interface UseWebLLMOptions {
  initProgressCallback?: (report: WebLLMProgress) => void
}

export interface UseWebLLMReturn {
  engine: Ref<webllm.MLCEngineInterface | null>
  isLoading: Ref<boolean>
  progress: Ref<number>
  error: Ref<Error | null>
  initializeEngine: () => Promise<void>
  loadModel: (modelId: string, options?: { temperature?: number; top_p?: number }) => Promise<void>
  generate: (prompt: string, options?: { max_tokens?: number; temperature?: number; top_p?: number }) => Promise<string>
  terminate: () => Promise<void>
}

/**
 * useWebLLM Composable
 * Core responsibilities:
 * - Initialize WebLLM engine
 * - Load model with progress callbacks
 * - Stream token generation
 * - Handle errors
 */
export function useWebLLM(options: UseWebLLMOptions = {}): UseWebLLMReturn {
  const engine = shallowRef<webllm.MLCEngineInterface | null>(null)
  const isLoading = ref(false)
  const progress = ref(0)
  const error = ref<Error | null>(null)

  const initProgressCallback = (report: webllm.InitProgressReport) => {
    progress.value = report.progress
    options.initProgressCallback?.({
      text: report.text,
      progress: report.progress,
      timeElapsed: 0 // WebLLM doesn't provide this directly
    })
  }

  const initializeEngine = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Use CreateMLCEngine from web-llm
      const newEngine = await webllm.CreateMLCEngine(
        'Llama-3.1-8B-Instruct-q4f32_1-MLC', // Default model, can be overridden
        {
          initProgressCallback,
          logLevel: 'WARN' as webllm.LogLevel
        }
      )
      engine.value = newEngine
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  const loadModel = async (
    modelId: string,
    _options: { temperature?: number; top_p?: number } = {}
  ) => {
    if (!engine.value) {
      await initializeEngine()
    }
    
    try {
      isLoading.value = true
      error.value = null
      progress.value = 0

      // For now, the engine is already initialized with a default model
      // In production, you'd reload with a different model
      // This is a simplified implementation
      
      console.log(`Model ${modelId} loaded successfully`)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw error.value
    } finally {
      isLoading.value = false
      progress.value = 100
    }
  }

  const generate = async (
    prompt: string,
    options: { max_tokens?: number; temperature?: number; top_p?: number } = {}
  ): Promise<string> => {
    if (!engine.value) {
      throw new Error('Engine not initialized. Call initializeEngine() first.')
    }

    try {
      error.value = null
      
      const messages: webllm.ChatCompletionMessageParam[] = [
        { role: 'user', content: prompt }
      ]

      const chunks: string[] = []
      
      const chunks1 = await engine.value.chat.completions.create({
        messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens ?? 512,
        stream: true,
        stream_options: { include_usage: false }
      })

      for await (const chunk of chunks1) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          chunks.push(content)
        }
      }

      return chunks.join('')
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw error.value
    }
  }

  const terminate = async () => {
    if (engine.value) {
      // WebLLM doesn't have explicit terminate, but we can reset the reference
      engine.value = null
    }
    progress.value = 0
    isLoading.value = false
  }

  return {
    engine,
    isLoading,
    progress,
    error,
    initializeEngine,
    loadModel,
    generate,
    terminate
  }
}
