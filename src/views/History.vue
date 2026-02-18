<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  clearRunHistory,
  loadRunHistory,
  type RunHistoryEntry,
} from '@/lib/run-history'

const entries = ref<RunHistoryEntry[]>([])

const refreshHistory = () => {
  entries.value = loadRunHistory()
}

const clearAllHistory = () => {
  clearRunHistory()
  refreshHistory()
}

const totalRuns = computed(() => entries.value.length)
const gauntletRuns = computed(
  () => entries.value.filter((entry) => entry.mode === 'gauntlet').length
)
const stressRuns = computed(
  () => entries.value.filter((entry) => entry.mode === 'stress').length
)
const quickRuns = computed(
  () => entries.value.filter((entry) => entry.mode === 'quick').length
)
const avgPassRate = computed(() => {
  if (entries.value.length === 0) return 0
  const total = entries.value.reduce((sum, entry) => sum + entry.passRate, 0)
  return Math.round((total / entries.value.length) * 100) / 100
})

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (durationMs: number) => {
  if (durationMs < 1000) return `${durationMs}ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${(durationMs / 60000).toFixed(1)}m`
}

onMounted(refreshHistory)
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">📜 History</h1>
        <p class="text-green-600">Past Benchmark Results</p>
      </div>

      <div class="border border-green-800 rounded-lg p-4 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-xl font-bold">Run History</h2>
          <div class="flex gap-2">
            <button
              class="bg-green-800 hover:bg-green-700 text-green-100 text-sm px-3 py-1 rounded"
              @click="refreshHistory"
            >
              Refresh
            </button>
            <button
              class="bg-red-800 hover:bg-red-700 disabled:bg-red-950 text-red-100 text-sm px-3 py-1 rounded"
              :disabled="entries.length === 0"
              @click="clearAllHistory"
            >
              Clear All
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-4">
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Total Runs</p>
            <p class="text-xl font-bold">{{ totalRuns }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Gauntlet</p>
            <p class="text-xl font-bold">{{ gauntletRuns }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Stress</p>
            <p class="text-xl font-bold">{{ stressRuns }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Quick</p>
            <p class="text-xl font-bold">{{ quickRuns }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Avg Pass Rate</p>
            <p class="text-xl font-bold">{{ avgPassRate.toFixed(1) }}%</p>
          </div>
        </div>

        <div v-if="entries.length === 0" class="border border-green-900 rounded p-8 text-center">
          <p class="text-4xl mb-3">🗂️</p>
          <p class="text-lg">No local runs recorded yet.</p>
          <p class="text-green-600 text-sm mt-2">
            Complete a Quick, Gauntlet, or Stress run to populate this history.
          </p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="entry in entries"
            :key="entry.id"
            class="border border-green-900 rounded p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span
                  class="text-xs px-2 py-1 rounded"
                  :class="
                    entry.mode === 'gauntlet'
                      ? 'bg-green-900 text-green-200'
                      : entry.mode === 'stress'
                        ? 'bg-cyan-900 text-cyan-200'
                        : 'bg-yellow-900 text-yellow-200'
                  "
                >
                  {{
                    entry.mode === 'gauntlet'
                      ? 'Gauntlet'
                      : entry.mode === 'stress'
                        ? 'Stress'
                        : 'Quick'
                  }}
                </span>
                <span class="font-bold">{{ entry.scenarioName }}</span>
              </div>
              <span class="text-xs text-green-600">{{ formatDateTime(entry.completedAt) }}</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div>
                <p class="text-green-600">Pass Rate</p>
                <p class="font-bold">{{ entry.passRate.toFixed(1) }}%</p>
              </div>
              <div>
                <p class="text-green-600">Rounds</p>
                <p class="font-bold">{{ entry.passedRounds }} / {{ entry.totalRounds }}</p>
              </div>
              <div>
                <p class="text-green-600">Duration</p>
                <p class="font-bold">{{ formatDuration(entry.durationMs) }}</p>
              </div>
              <div>
                <p class="text-green-600">Score</p>
                <p class="font-bold">{{ entry.scorePct !== undefined ? `${entry.scorePct.toFixed(1)}%` : 'N/A' }}</p>
              </div>
              <div>
                <p class="text-green-600">Verdict</p>
                <p class="font-bold">{{ entry.verdict || 'N/A' }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>
