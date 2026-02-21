<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BattleArena from '@/components/BattleArena.vue'
import { useSystemStore } from '@/stores/systemStore'
import { logicTrapsGrouped, logicTrapsLevel1 } from '@/data/traps'
import { parseChallengeParams } from '@/lib/share/share-link'
import { setSelectedModelId } from '@/lib/settings-store'

const systemStore = useSystemStore()
const route = useRoute()
const challengeHint = ref<string | null>(null)
const preselectedScenarioId = ref('')

const isEngineReady = computed(() => systemStore.isModelReady)
const isEngineLoading = computed(() => systemStore.status.webLlmEngine === 'LOADING')

const initializeEngine = async () => {
  await systemStore.initializeEngine()
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
