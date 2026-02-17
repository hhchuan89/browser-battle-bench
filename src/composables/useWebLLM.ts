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

export interface GenerateOptions {
  max_tokens?: number
  temperature?: number
  top_p?: number
  onChunk?: (chunk: string, accumulated: string) => void
}

export interface UseWebLLMReturn {
  engine: Ref<webllm.MLCEngineInterface | null>
  isLoading: Ref<boolean>
  progress: Ref<number>
  error: Ref<Error | null>
  initializeEngine: (modelId?: string) => Promise<void>
  loadModel: (modelId: string, options?: { temperature?: number; top_p?: number }) => Promise<void>
  generate: (prompt: string, options?: GenerateOptions) => Promise<string>
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
  const currentModelId = ref<string | null>(null)
  const fallbackModelId = 'Llama-3.1-8B-Instruct-q4f32_1-MLC'

  const initProgressCallback = (report: webllm.InitProgressReport) => {
    progress.value = report.progress
    options.initProgressCallback?.({
      text: report.text,
      progress: report.progress,
      timeElapsed: 0
    })
  }

  const resolveModelId = (modelId?: string) =>
    modelId ?? currentModelId.value ?? fallbackModelId

  const isQuotaError = (message: string) =>
    /quota/i.test(message) || /QuotaExceededError/i.test(message)

  const createEngine = async (modelId: string) => {
    if (engine.value && currentModelId.value === modelId) {
      return
    }

    const newEngine = await webllm.CreateMLCEngine(
      modelId,
      {
        initProgressCallback,
        logLevel: 'WARN' as webllm.LogLevel
      }
    )
    engine.value = newEngine
    currentModelId.value = modelId
  }

  const initializeEngine = async (modelId?: string) => {
    try {
      isLoading.value = true
      error.value = null
      progress.value = 0

      await createEngine(resolveModelId(modelId))
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
    try {
      isLoading.value = true
      error.value = null
      progress.value = 0
      await createEngine(modelId)
      console.log(`Model ${modelId} loaded successfully`)
    } catch (e) {
      const rawError = e instanceof Error ? e : new Error(String(e))
      if (isQuotaError(rawError.message)) {
        const quotaError = new Error(
          'Model download failed: browser storage quota exceeded. Try a smaller model or clear site data.'
        )
        error.value = quotaError
        throw quotaError
      }
      error.value = rawError
      throw rawError
    } finally {
      isLoading.value = false
      progress.value = 100
    }
  }

  const generate = async (
    prompt: string,
    opts: GenerateOptions = {}
  ): Promise<string> => {
    if (!engine.value) {
      throw new Error('Engine not initialized. Call initializeEngine() first.')
    }

    try {
      error.value = null
      
      const messages: webllm.ChatCompletionMessageParam[] = [
        { role: 'user', content: prompt }
      ]

      let accumulated = ''
      
      const chunkStream = await engine.value.chat.completions.create({
        messages,
        temperature: opts.temperature ?? 0.7,
        top_p: opts.top_p ?? 0.9,
        max_tokens: opts.max_tokens ?? 512,
        stream: true,
        stream_options: { include_usage: false }
      })

      for await (const chunk of chunkStream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          accumulated += content
          opts.onChunk?.(content, accumulated)
        }
      }

      return accumulated
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      throw error.value
    }
  }

  const terminate = async () => {
    if (engine.value) {
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
