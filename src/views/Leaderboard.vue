<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadRunHistory, type RunHistoryEntry } from '@/lib/run-history'
import { fetchGlobalLeaderboard } from '@/lib/share/publish-report'
import type { GlobalLeaderboardRow, PublishMode } from '@/lib/share/publish-types'

interface LocalLeaderboardRow {
  key: string
  mode: 'gauntlet' | 'stress' | 'quick'
  scenarioId: string
  scenarioName: string
  runs: number
  bestPassRate: number
  avgPassRate: number
  bestScorePct: number | null
  latestCompletedAt: string
}

type TabMode = 'local' | 'global'

const activeTab = ref<TabMode>('local')
const entries = ref<RunHistoryEntry[]>([])

const globalRows = ref<GlobalLeaderboardRow[]>([])
const globalTotal = ref(0)
const globalStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const globalError = ref<string | null>(null)
const globalModeFilter = ref<PublishMode | 'all'>('all')
const globalLimit = ref(25)

const refreshLocalLeaderboard = () => {
  entries.value = loadRunHistory()
}

const refreshGlobalLeaderboard = async () => {
  globalStatus.value = 'loading'
  globalError.value = null

  try {
    const result = await fetchGlobalLeaderboard({
      mode: globalModeFilter.value,
      limit: globalLimit.value,
    })
    globalRows.value = result.rows
    globalTotal.value = result.total
    globalStatus.value = 'ready'
  } catch (error) {
    globalStatus.value = 'error'
    globalError.value = error instanceof Error ? error.message : String(error)
  }
}

const localTotalRuns = computed(() => entries.value.length)
const localBestPassRate = computed(() => {
  if (entries.value.length === 0) return 0
  return Math.max(...entries.value.map((entry) => entry.passRate))
})

const localRows = computed<LocalLeaderboardRow[]>(() => {
  const grouped = new Map<string, RunHistoryEntry[]>()

  for (const entry of entries.value) {
    const key = `${entry.mode}:${entry.scenarioId}`
    const list = grouped.get(key) || []
    list.push(entry)
    grouped.set(key, list)
  }

  const rows: LocalLeaderboardRow[] = []

  for (const [key, group] of grouped.entries()) {
    const sortedByLatest = [...group].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    const latest = sortedByLatest[0]
    const runs = group.length
    const passTotal = group.reduce((sum, entry) => sum + entry.passRate, 0)

    const scoreCandidates = group
      .map((entry) => entry.scorePct)
      .filter((score): score is number => typeof score === 'number')

    rows.push({
      key,
      mode: latest.mode,
      scenarioId: latest.scenarioId,
      scenarioName: latest.scenarioName,
      runs,
      bestPassRate: Math.max(...group.map((entry) => entry.passRate)),
      avgPassRate: passTotal / runs,
      bestScorePct: scoreCandidates.length > 0 ? Math.max(...scoreCandidates) : null,
      latestCompletedAt: latest.completedAt,
    })
  }

  return rows.sort((a, b) => {
    if (b.bestPassRate !== a.bestPassRate) return b.bestPassRate - a.bestPassRate
    if (b.avgPassRate !== a.avgPassRate) return b.avgPassRate - a.avgPassRate
    return b.runs - a.runs
  })
})

const modeClass = (mode: string): string => {
  switch (mode) {
    case 'arena':
      return 'bg-orange-900 text-orange-200'
    case 'quick':
      return 'bg-yellow-900 text-yellow-200'
    case 'gauntlet':
      return 'bg-green-900 text-green-200'
    case 'stress':
      return 'bg-cyan-900 text-cyan-200'
    default:
      return 'bg-gray-800 text-gray-200'
  }
}

const modeLabel = (mode: string): string =>
  mode.charAt(0).toUpperCase() + mode.slice(1)

const formatDateTime = (iso: string): string => {
  const date = new Date(iso)
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  refreshLocalLeaderboard()
  void refreshGlobalLeaderboard()
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
        <p class="text-green-600">Local + Global Benchmark Rankings</p>
      </div>

      <div class="border border-green-800 rounded-lg p-4 mb-6">
        <div class="flex flex-wrap gap-2 mb-4">
          <button
            class="px-3 py-1 rounded text-sm"
            :class="activeTab === 'local' ? 'bg-green-700 text-black' : 'bg-green-900 text-green-200 hover:bg-green-800'"
            @click="activeTab = 'local'"
          >
            Local
          </button>
          <button
            class="px-3 py-1 rounded text-sm"
            :class="activeTab === 'global' ? 'bg-cyan-700 text-black' : 'bg-cyan-900 text-cyan-200 hover:bg-cyan-800'"
            @click="activeTab = 'global'"
          >
            Global
          </button>
        </div>

        <section v-if="activeTab === 'local'" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-bold">Local Leaderboard</h2>
            <button
              class="bg-green-800 hover:bg-green-700 text-green-100 text-sm px-3 py-1 rounded"
              @click="refreshLocalLeaderboard"
            >
              Refresh Local
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div class="border border-green-900 rounded p-3">
              <p class="text-green-600">Total Runs</p>
              <p class="text-xl font-bold">{{ localTotalRuns }}</p>
            </div>
            <div class="border border-green-900 rounded p-3">
              <p class="text-green-600">Ranked Entries</p>
              <p class="text-xl font-bold">{{ localRows.length }}</p>
            </div>
            <div class="border border-green-900 rounded p-3">
              <p class="text-green-600">Best Pass Rate</p>
              <p class="text-xl font-bold">{{ localBestPassRate.toFixed(1) }}%</p>
            </div>
            <div class="border border-green-900 rounded p-3">
              <p class="text-green-600">Data Source</p>
              <p class="text-xl font-bold">Local</p>
            </div>
          </div>

          <div v-if="localRows.length === 0" class="border border-green-900 rounded p-8 text-center">
            <p class="text-4xl mb-3">🏁</p>
            <p class="text-lg">No local ranking data yet.</p>
            <p class="text-green-600 text-sm mt-2">
              Complete Quick, Gauntlet, or Stress runs to populate local leaderboard.
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="(row, index) in localRows.slice(0, 10)"
              :key="row.key"
              class="border border-green-900 rounded p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold w-8">#{{ index + 1 }}</span>
                  <span class="text-xs px-2 py-1 rounded" :class="modeClass(row.mode)">
                    {{ modeLabel(row.mode) }}
                  </span>
                  <span class="font-bold">{{ row.scenarioName }}</span>
                </div>
                <span class="text-xs text-green-600">{{ formatDateTime(row.latestCompletedAt) }}</span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <p class="text-green-600">Best Pass</p>
                  <p class="font-bold">{{ row.bestPassRate.toFixed(1) }}%</p>
                </div>
                <div>
                  <p class="text-green-600">Avg Pass</p>
                  <p class="font-bold">{{ row.avgPassRate.toFixed(1) }}%</p>
                </div>
                <div>
                  <p class="text-green-600">Runs</p>
                  <p class="font-bold">{{ row.runs }}</p>
                </div>
                <div>
                  <p class="text-green-600">Best Score</p>
                  <p class="font-bold">{{ row.bestScorePct !== null ? `${row.bestScorePct.toFixed(1)}%` : 'N/A' }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-bold">Global Leaderboard</h2>
            <div class="flex flex-wrap gap-2">
              <select
                v-model="globalModeFilter"
                class="bg-black border border-cyan-800 text-cyan-100 text-sm rounded px-2 py-1"
              >
                <option value="all">All Modes</option>
                <option value="arena">Arena</option>
                <option value="quick">Quick</option>
                <option value="gauntlet">Gauntlet</option>
                <option value="stress">Stress</option>
              </select>
              <button
                class="bg-cyan-800 hover:bg-cyan-700 text-cyan-100 text-sm px-3 py-1 rounded"
                @click="void refreshGlobalLeaderboard()"
              >
                Refresh Global
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div class="border border-cyan-900 rounded p-3">
              <p class="text-cyan-500">Rows Loaded</p>
              <p class="text-xl font-bold">{{ globalRows.length }}</p>
            </div>
            <div class="border border-cyan-900 rounded p-3">
              <p class="text-cyan-500">Matched Total</p>
              <p class="text-xl font-bold">{{ globalTotal }}</p>
            </div>
            <div class="border border-cyan-900 rounded p-3">
              <p class="text-cyan-500">Status</p>
              <p class="text-xl font-bold">{{ globalStatus }}</p>
            </div>
            <div class="border border-cyan-900 rounded p-3">
              <p class="text-cyan-500">Data Source</p>
              <p class="text-xl font-bold">Supabase</p>
            </div>
          </div>

          <p v-if="globalError" class="text-red-400 text-sm">Global error: {{ globalError }}</p>

          <div v-if="globalStatus === 'loading'" class="border border-cyan-900 rounded p-6 text-center text-cyan-300">
            Loading global leaderboard...
          </div>

          <div
            v-else-if="globalRows.length === 0"
            class="border border-cyan-900 rounded p-8 text-center"
          >
            <p class="text-4xl mb-3">🌐</p>
            <p class="text-lg">No global entries yet.</p>
            <p class="text-cyan-500 text-sm mt-2">
              Publish a result from Arena/Quick/Gauntlet/Stress to appear here.
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="(row, index) in globalRows"
              :key="row.id"
              class="border border-cyan-900 rounded p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold w-8">#{{ index + 1 }}</span>
                  <span class="text-xs px-2 py-1 rounded" :class="modeClass(row.mode)">
                    {{ modeLabel(row.mode) }}
                  </span>
                  <span class="font-bold">{{ row.scenario_name }}</span>
                </div>
                <span class="text-xs text-cyan-600">{{ formatDateTime(row.created_at) }}</span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div>
                  <p class="text-cyan-500">Score</p>
                  <p class="font-bold">{{ row.score.toFixed(1) }}</p>
                </div>
                <div>
                  <p class="text-cyan-500">Grade</p>
                  <p class="font-bold">{{ row.grade }}</p>
                </div>
                <div>
                  <p class="text-cyan-500">Pass Rate</p>
                  <p class="font-bold">{{ row.pass_rate !== null && row.pass_rate !== undefined ? `${row.pass_rate.toFixed(1)}%` : 'N/A' }}</p>
                </div>
                <div>
                  <p class="text-cyan-500">Tier</p>
                  <p class="font-bold">{{ row.tier }}</p>
                </div>
                <div>
                  <p class="text-cyan-500">Model</p>
                  <p class="font-bold break-all">{{ row.model_id }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
