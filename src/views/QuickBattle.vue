<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BattleArena from '@/components/BattleArena.vue'
import { useSystemStore } from '@/stores/systemStore'
import { quickBattle30sScenario } from '@/data/quickBattlePack'
import { setSelectedModelId } from '@/lib/settings-store'
import { parseChallengeParams } from '@/lib/share/share-link'

const systemStore = useSystemStore()
const route = useRoute()
const challengeHint = ref<string | null>(null)

const isEngineReady = computed(() => systemStore.isModelReady)
const isEngineLoading = computed(() => systemStore.status.webLlmEngine === 'LOADING')

const initializeEngine = async () => {
  await systemStore.initializeEngine()
}

onMounted(() => {
  const parsed = parseChallengeParams(route.query)
  if (!parsed || parsed.mode !== 'quick') return
  if (parsed.modelId) {
    setSelectedModelId(parsed.modelId)
  }
  challengeHint.value = `Challenge loaded: ${quickBattle30sScenario.name}${
    parsed.modelId ? ` · ${parsed.modelId}` : ''
  }`
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">⚡ Quick Battle</h1>
        <p class="text-green-600">3 Rounds, 30 Seconds, Zero Excuses</p>
      </div>

      <div
        v-if="challengeHint"
        class="mb-6 border border-cyan-700 bg-cyan-900/20 rounded-lg p-3 text-sm text-cyan-200"
      >
        {{ challengeHint }}
      </div>

      <div v-if="!isEngineReady" class="border border-green-800 rounded-lg p-6 bg-black/50">
        <p class="text-green-300 mb-4">
          Initialize the local WebLLM engine to start the 30-second quick battle.
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

      <BattleArena
        v-else
        :scenarios="[quickBattle30sScenario]"
        default-scenario-id="quick-battle-30s"
        mode="quick"
        :time-limit-seconds="30"
      />
    </div>
  </div>
</template>
