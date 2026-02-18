<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWebLLM } from '@/composables/useWebLLM'
import { useStreamValidator } from '@/composables/useStreamValidator'
import { useScorer } from '@/composables/useScorer'
import { usePersistence } from '@/composables/usePersistence'
import { easySchemas, type SchemaDefinition } from '@/data/schemas/easy'
import { getDefaultModelId } from '@/lib/settings-store'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import { z } from 'zod'

// State
const selectedSchema = ref<SchemaDefinition>(easySchemas[0])
const battleStatus = ref<'idle' | 'loading' | 'streaming' | 'scoring' | 'complete'>('idle')
const error = ref<string | null>(null)

// Streaming output
const outputText = ref('')

// Scoring
const scoreResult = ref<any>(null)

// TTFT tracking
const firstTokenTime = ref<number | null>(null)

// Composables
const { 
  // engine, 
  // isLoading, 
  progress, 
  // error: llmError,
  loadModel,
  generate 
} = useWebLLM()

const { 
  validateStream, 
  reset: resetValidator, 
  result: validatorResult 
} = useStreamValidator()

const { calculateScore } = useScorer()
const modelPreference = usePersistence<string>(
  STORAGE_KEYS.selectedModel,
  getDefaultModelId(),
  { autoSave: true }
)
const selectedModel = modelPreference.state

// Available models (WebLLM supported)
const availableModels = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B (Fastest)', tier: 'free' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 3B', tier: 'free' },
  { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', name: 'Llama 3.1 8B', tier: 'pro' },
]

// Start battle
const startBattle = async () => {
  error.value = null
  outputText.value = ''
  scoreResult.value = null
  resetValidator()
  firstTokenTime.value = null
  battleStatus.value = 'loading'

  try {
    // Initialize engine with selected model
    await loadModel(selectedModel.value)
    battleStatus.value = 'streaming'

    // Build prompt
    const fullPrompt = `${selectedSchema.value.systemPrompt}\n\n${selectedSchema.value.prompt}`

    // Start generation
    const startTime = Date.now()
    let fullResponse = ''

    const response = await generate(fullPrompt, {
      max_tokens: 512,
      temperature: 0.7,
      onChunk: (chunk, accumulated) => {
        if (firstTokenTime.value === null) {
          firstTokenTime.value = Date.now() - startTime
        }
        fullResponse = accumulated
        outputText.value = accumulated
        validateStream(chunk)
      }
    })

    fullResponse = response
    outputText.value = response
    if (firstTokenTime.value === null) {
      firstTokenTime.value = Date.now() - startTime
    }

    battleStatus.value = 'scoring'

    // Validate and score
    const validation = validateStream('')
    
    // Parse schema for scoring (using strict mode for security)
    const schemaObj = z.object(selectedSchema.value.schema as any).strict()
    
    const score = calculateScore(
      validation,
      fullResponse,
      schemaObj,
      firstTokenTime.value
    )

    scoreResult.value = score
    battleStatus.value = 'complete'

  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    battleStatus.value = 'idle'
  }
}

// Reset battle
const resetBattle = () => {
  battleStatus.value = 'idle'
  outputText.value = ''
  scoreResult.value = null
  error.value = null
  resetValidator()
}

// Validation state
const validationState = computed(() => validatorResult.value)
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">⚔️ Arena</h1>
        <p class="text-green-600">Quick Battle - Head-to-Head LLM Benchmarking</p>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="mb-6 p-4 border border-red-600 bg-red-900/20 rounded-lg">
        <p class="text-red-400 font-bold">❌ Error</p>
        <p class="text-red-300 mt-1">{{ error }}</p>
        <button 
          @click="resetBattle"
          class="mt-3 px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-sm"
        >
          Dismiss
        </button>
      </div>

      <!-- Controls -->
      <div class="grid md:grid-cols-2 gap-6 mb-8">
        <!-- Model Selector -->
        <div class="border border-green-800 rounded-lg p-4">
          <label class="block text-sm text-green-500 mb-2">Model</label>
          <select 
            v-model="selectedModel"
            :disabled="battleStatus !== 'idle'"
            class="w-full bg-black border border-green-700 rounded p-3 text-green-400 focus:border-green-500 focus:outline-none"
          >
            <option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>

        <!-- Schema Selector -->
        <div class="border border-green-800 rounded-lg p-4">
          <label class="block text-sm text-green-500 mb-2">Challenge</label>
          <select 
            v-model="selectedSchema"
            :disabled="battleStatus !== 'idle'"
            class="w-full bg-black border border-green-700 rounded p-3 text-green-400 focus:border-green-500 focus:outline-none"
          >
            <option v-for="schema in easySchemas" :key="schema.id" :value="schema">
              {{ schema.name }} ({{ schema.difficulty }})
            </option>
          </select>
        </div>
      </div>

      <!-- Challenge Info -->
      <div class="border border-green-800 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-bold mb-2">📋 Challenge: {{ selectedSchema.name }}</h3>
        <p class="text-green-300 text-sm mb-2"><strong>Prompt:</strong> {{ selectedSchema.prompt }}</p>
        <p class="text-green-500 text-xs"><strong>System:</strong> {{ selectedSchema.systemPrompt }}</p>
      </div>

      <!-- Action Button -->
      <div class="mb-8">
        <button 
          v-if="battleStatus === 'idle'"
          @click="startBattle"
          class="w-full py-4 bg-green-700 hover:bg-green-600 text-black font-bold text-lg rounded-lg transition-colors"
        >
          🥊 Start Battle
        </button>

        <!-- Loading State -->
        <div v-else-if="battleStatus === 'loading'" class="border border-green-800 rounded-lg p-8 text-center">
          <div class="text-4xl mb-4">⏳</div>
          <p class="text-xl">Loading Model...</p>
          <div class="mt-4 w-full bg-green-900 h-2 rounded overflow-hidden">
            <div 
              class="bg-green-400 h-full transition-all duration-300"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <p class="text-green-500 mt-2">{{ progress.toFixed(0) }}%</p>
        </div>

        <!-- Streaming State -->
        <div v-else-if="battleStatus === 'streaming' || battleStatus === 'scoring'" class="border border-green-800 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">
              {{ battleStatus === 'streaming' ? '📡 Streaming...' : '📊 Scoring...' }}
            </h3>
            <div v-if="firstTokenTime" class="text-sm text-green-500">
              TTFT: {{ firstTokenTime }}ms
            </div>
          </div>
          
          <!-- Live Output -->
          <pre class="bg-black border border-green-900 rounded p-4 text-green-300 text-sm overflow-x-auto whitespace-pre-wrap">{{ outputText || 'Waiting for tokens...' }}</pre>

          <!-- Validation Status -->
          <div v-if="validationState" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div :class="validationState.startsWithBrace ? 'text-green-400' : 'text-red-400'">
              {{ validationState.startsWithBrace ? '✅' : '❌' }} Starts with {
            </div>
            <div :class="!validationState.hasCodeBlock ? 'text-green-400' : 'text-red-400'">
              {{ !validationState.hasCodeBlock ? '✅' : '❌' }} No Code Blocks
            </div>
            <div :class="validationState.detectedPrefixes.length === 0 ? 'text-green-400' : 'text-yellow-400'">
              {{ validationState.detectedPrefixes.length === 0 ? '✅' : '⚠️' }} No Prefixes
            </div>
            <div :class="!validationState.shouldGuillotine ? 'text-green-400' : 'text-red-400'">
              {{ !validationState.shouldGuillotine ? '✅' : '✂️' }} No Guillotine
            </div>
          </div>
        </div>
      </div>

      <!-- Score Results -->
      <div v-if="scoreResult" class="border-2 border-green-600 rounded-lg p-6 mb-8">
        <h3 class="text-2xl font-bold mb-4">🏆 Score: {{ scoreResult.totalScore }}/100</h3>
        
        <div class="grid md:grid-cols-2 gap-4 mb-6">
          <div class="bg-green-900/30 rounded p-3">
            <p class="text-green-500 text-sm">Format Compliance</p>
            <p class="text-xl font-bold">{{ scoreResult.breakdown.formatCompliance }}%</p>
          </div>
          <div class="bg-green-900/30 rounded p-3">
            <p class="text-green-500 text-sm">Field Completeness</p>
            <p class="text-xl font-bold">{{ scoreResult.breakdown.fieldCompleteness }}%</p>
          </div>
          <div class="bg-green-900/30 rounded p-3">
            <p class="text-green-500 text-sm">Response Efficiency</p>
            <p class="text-xl font-bold">{{ scoreResult.breakdown.responseEfficiency }}%</p>
          </div>
          <div class="bg-green-900/30 rounded p-3">
            <p class="text-green-500 text-sm">Schema Purity</p>
            <p class="text-xl font-bold">{{ scoreResult.breakdown.schemaPurity }}%</p>
          </div>
          <div class="bg-green-900/30 rounded p-3">
            <p class="text-green-500 text-sm">TTFT Score</p>
            <p class="text-xl font-bold">{{ scoreResult.breakdown.ttft.toFixed(1) }}%</p>
          </div>
        </div>

        <!-- Errors & Warnings -->
        <div v-if="scoreResult.errors.length" class="mb-3">
          <p class="text-red-400 font-bold">Errors:</p>
          <ul class="text-red-300 text-sm">
            <li v-for="(err, i) in scoreResult.errors" :key="i">• {{ err }}</li>
          </ul>
        </div>
        <div v-if="scoreResult.warnings.length">
          <p class="text-yellow-400 font-bold">Warnings:</p>
          <ul class="text-yellow-300 text-sm">
            <li v-for="(warn, i) in scoreResult.warnings" :key="i">• {{ warn }}</li>
          </ul>
        </div>

        <button 
          @click="resetBattle"
          class="mt-6 w-full py-3 bg-green-700 hover:bg-green-600 text-black font-bold rounded"
        >
          🔄 New Battle
        </button>
      </div>

      <!-- Back Link -->
      <div class="mt-8 text-center">
        <router-link to="/" class="text-green-500 hover:underline">← Back to Home</router-link>
      </div>
    </div>
  </div>
</template>
