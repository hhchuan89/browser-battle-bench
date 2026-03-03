<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BattleArena from '@/components/BattleArena.vue'
import { useSystemStore } from '@/stores/systemStore'
import { logicTrapsGrouped, logicTrapsLevel1 } from '@/data/traps'
import { parseChallengeParams } from '@/lib/share/share-link'
import { getSelectedModelId, setSelectedModelId } from '@/lib/settings-store'
import {
  clearWebLlmCaches,
  isShaderModuleErrorMessage,
  pickAlternateModel,
} from '@/lib/webgpu-recovery'

const systemStore = useSystemStore()
const route = useRoute()
const challengeHint = ref<string | null>(null)
const preselectedScenarioId = ref('')
const recoveryMessage = ref<string | null>(null)
const clearingShaderCache = ref(false)

const isEngineReady = computed(() => systemStore.isModelReady)
const isEngineLoading = computed(() => systemStore.status.webLlmEngine === 'LOADING')
const isEngineError = computed(() => systemStore.status.webLlmEngine === 'ERROR')
const engineInitError = computed(() => systemStore.engineInitError || '')
const isShaderInitError = computed(() =>
  isShaderModuleErrorMessage(engineInitError.value)
)

const modelNameById: Record<string, string> = {
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'Llama 3.2 1B',
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': 'Llama 3.2 3B',
  'Llama-3.1-8B-Instruct-q4f16_1-MLC': 'Llama 3.1 8B',
}

const dismissEngineError = () => {
  systemStore.clearEngineInitError()
  recoveryMessage.value = null
}

const initializeEngine = async () => {
  recoveryMessage.value = null
  await systemStore.initializeEngine()
}

const clearShaderCache = async () => {
  clearingShaderCache.value = true
  recoveryMessage.value = null
  try {
    await clearWebLlmCaches()
    dismissEngineError()
    recoveryMessage.value =
      'Model cache cleared. Click Initialize Engine to retry.'
  } catch {
    recoveryMessage.value =
      'Cache clear did not complete cleanly. Try switch model or reload.'
  } finally {
    clearingShaderCache.value = false
  }
}

const switchModelAndGuide = () => {
  const current = getSelectedModelId()
  const next = pickAlternateModel(current)
  if (!next) {
    recoveryMessage.value = 'No alternative model available.'
    return
  }
  setSelectedModelId(next)
  dismissEngineError()
  recoveryMessage.value = `Switched model to ${
    modelNameById[next] || next
  }. Click Initialize Engine.`
}

const availableScenarioIds = [logicTrapsLevel1.id, logicTrapsGrouped.id]

onMounted(() => {
  const parsed = parseChallengeParams(route.query)
  if (!parsed || parsed.mode !== 'gauntlet') return
  if (parsed.modelId) {
    setSelectedModelId(parsed.modelId)
  }
  if (parsed.scenarioId && availableScenarioIds.includes(parsed.scenarioId)) {
    preselectedScenarioId.value = parsed.scenarioId
  }
  challengeHint.value = `Challenge loaded: ${
    preselectedScenarioId.value || logicTrapsLevel1.id
  }${parsed.modelId ? ` · ${parsed.modelId}` : ''}`
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">🥊 Gauntlet</h1>
        <p class="text-green-600">Sequential Challenge Mode</p>
      </div>

      <div
        v-if="challengeHint"
        class="mb-6 border border-cyan-700 bg-cyan-900/20 rounded-lg p-3 text-sm text-cyan-200"
      >
        {{ challengeHint }}
      </div>

      <div v-if="!isEngineReady" class="border border-green-800 rounded-lg p-6 bg-black/50">
        <p class="text-green-300 mb-4">
          Initialize the local WebLLM engine to unlock Gauntlet battles.
        </p>

        <div
          v-if="isEngineError && isShaderInitError"
          class="mb-4 p-4 border border-amber-600 bg-amber-900/15 rounded-lg"
        >
          <p class="text-amber-300 font-bold">⚠️ WebGPU Shader Compatibility Issue</p>
          <p class="text-amber-200 mt-1 text-sm">
            The selected model failed GPU shader compilation on this browser/GPU.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              class="px-3 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-amber-900/50 text-black rounded text-sm font-semibold"
              :disabled="clearingShaderCache"
              @click="void clearShaderCache()"
            >
              {{ clearingShaderCache ? 'Clearing Cache...' : 'Clear Model Cache' }}
            </button>
            <button
              class="px-3 py-2 bg-green-700 hover:bg-green-600 text-black rounded text-sm font-semibold"
              @click="switchModelAndGuide"
            >
              Switch Model (Recommended)
            </button>
            <button
              class="px-3 py-2 border border-amber-700 hover:bg-amber-900/20 rounded text-sm"
              @click="dismissEngineError"
            >
              Dismiss
            </button>
          </div>
          <details class="mt-3 text-xs text-amber-300/80">
            <summary class="cursor-pointer hover:text-amber-200">Show technical details</summary>
            <pre class="mt-2 whitespace-pre-wrap break-all">{{ engineInitError }}</pre>
          </details>
        </div>

        <div
          v-else-if="isEngineError"
          class="mb-4 p-4 border border-red-600 bg-red-900/20 rounded-lg"
        >
          <p class="text-red-300 font-bold">❌ Engine Initialization Failed</p>
          <p class="text-red-200 text-sm mt-1">
            Click Initialize Engine to retry. If the issue repeats, switch model.
          </p>
          <details class="mt-3 text-xs text-red-300/80">
            <summary class="cursor-pointer hover:text-red-200">Show technical details</summary>
            <pre class="mt-2 whitespace-pre-wrap break-all">{{ engineInitError }}</pre>
          </details>
        </div>

        <div
          v-if="recoveryMessage"
          class="mb-4 border border-green-700 bg-green-900/20 rounded-lg p-3 text-sm text-green-200"
        >
          {{ recoveryMessage }}
        </div>

        <button
          class="bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-black font-bold py-2 px-4 rounded"
          :disabled="isEngineLoading"
          @click="initializeEngine"
        >
          {{ isEngineLoading ? 'Initializing...' : 'Initialize Engine' }}
        </button>

        <div v-if="isEngineLoading" class="mt-4">
          <div class="w-full bg-green-900 h-2 rounded overflow-hidden">
            <div
              class="bg-green-400 h-full transition-all duration-300"
              :style="{ width: `${Math.round(systemStore.modelLoadingProgress * 100)}%` }"
            ></div>
          </div>
          <p class="text-xs text-green-500 mt-2">
            {{ systemStore.loadingText || 'Preparing model...' }}
          </p>
        </div>
      </div>

      <BattleArena v-else :default-scenario-id="preselectedScenarioId" />
    </div>
  </div>
</template>
