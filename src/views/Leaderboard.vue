<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadRunHistory, type RunHistoryEntry } from '@/lib/run-history'
import {
  loadRemoteLeaderboardEntries,
  loadRemoteSourcesFromSettings,
  parseGistSourceInput,
  type RemoteRunEntry,
} from '@/lib/gist-leaderboard'
import {
  getGistAuth,
  getGistLeaderboardSources,
  setGistLeaderboardSources,
} from '@/lib/settings-store'

interface LeaderboardRow {
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

const entries = ref<RunHistoryEntry[]>([])
const remoteEntries = ref<RemoteRunEntry[]>([])
const remoteStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const remoteError = ref<string | null>(null)
const sourceInput = ref(
  getGistLeaderboardSources()
    .map((source) => source.id)
    .join('\n')
)

const refreshLeaderboard = () => {
  entries.value = loadRunHistory()
}

const refreshRemoteLeaderboard = async () => {
  const sources = parseGistSourceInput(sourceInput.value)
  setGistLeaderboardSources(sources.map((id) => ({ id })))

  if (sources.length === 0) {
    remoteEntries.value = []
    remoteStatus.value = 'idle'
    remoteError.value = null
    return
  }

  remoteStatus.value = 'loading'
  remoteError.value = null
  try {
    const auth = getGistAuth()
    remoteEntries.value = await loadRemoteLeaderboardEntries(
      sources,
      auth?.accessToken
    )
    remoteStatus.value = 'ready'
  } catch (error) {
    remoteError.value = error instanceof Error ? error.message : String(error)
    remoteStatus.value = 'error'
  }
}

const combinedEntries = computed<RunHistoryEntry[]>(() => [
  ...entries.value,
  ...remoteEntries.value,
])

const totalRuns = computed(() => combinedEntries.value.length)
const totalRemoteRuns = computed(() => remoteEntries.value.length)
const bestPassRateOverall = computed(() => {
  if (combinedEntries.value.length === 0) return 0
  return Math.max(...combinedEntries.value.map((entry) => entry.passRate))
})

const leaderboardRows = computed<LeaderboardRow[]>(() => {
  const grouped = new Map<string, RunHistoryEntry[]>()

  for (const entry of combinedEntries.value) {
    const key = `${entry.mode}:${entry.scenarioId}`
    const list = grouped.get(key) || []
    list.push(entry)
    grouped.set(key, list)
  }

  const rows: LeaderboardRow[] = []

  for (const [key, group] of grouped.entries()) {
    const sortedByLatest = [...group].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )
    const latest = sortedByLatest[0]

    const runs = group.length
    const passTotal = group.reduce((sum, entry) => sum + entry.passRate, 0)
    const avgPassRate = passTotal / runs
    const bestPassRate = Math.max(...group.map((entry) => entry.passRate))

    const scoreCandidates = group
      .map((entry) => entry.scorePct)
      .filter((score): score is number => typeof score === 'number')
    const bestScorePct = scoreCandidates.length > 0 ? Math.max(...scoreCandidates) : null

    rows.push({
      key,
      mode: latest.mode,
      scenarioId: latest.scenarioId,
      scenarioName: latest.scenarioName,
      runs,
      bestPassRate,
      avgPassRate,
      bestScorePct,
      latestCompletedAt: latest.completedAt,
    })
  }

  return rows.sort((a, b) => {
    if (b.bestPassRate !== a.bestPassRate) return b.bestPassRate - a.bestPassRate
    if (b.avgPassRate !== a.avgPassRate) return b.avgPassRate - a.avgPassRate
    return b.runs - a.runs
  })
})

const topRows = computed(() => leaderboardRows.value.slice(0, 10))

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

onMounted(refreshLeaderboard)
onMounted(() => {
  if (loadRemoteSourcesFromSettings().length > 0) {
    void refreshRemoteLeaderboard()
  }
})
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">🏆 Leaderboard</h1>
        <p class="text-green-600">Local Benchmark Rankings</p>
      </div>

      <div class="border border-green-800 rounded-lg p-4 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 class="text-xl font-bold">Local Leaderboard</h2>
          <div class="flex flex-wrap gap-2">
            <button
              class="bg-green-800 hover:bg-green-700 text-green-100 text-sm px-3 py-1 rounded"
              @click="refreshLeaderboard"
            >
              Refresh Local
            </button>
            <button
              class="bg-cyan-800 hover:bg-cyan-700 text-cyan-100 text-sm px-3 py-1 rounded"
              @click="refreshRemoteLeaderboard"
            >
              Refresh Remote
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Total Runs</p>
            <p class="text-xl font-bold">{{ totalRuns }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Ranked Entries</p>
            <p class="text-xl font-bold">{{ leaderboardRows.length }}</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Best Pass Rate</p>
            <p class="text-xl font-bold">{{ bestPassRateOverall.toFixed(1) }}%</p>
          </div>
          <div class="border border-green-900 rounded p-3">
            <p class="text-green-600">Data Source</p>
            <p class="text-xl font-bold">
              {{ totalRemoteRuns > 0 ? 'Local + Remote' : 'Local' }}
            </p>
          </div>
        </div>

        <div class="border border-green-900 rounded p-4 text-sm mb-4 space-y-2">
          <p class="text-green-500 font-bold">Remote Leaderboard Sources</p>
          <textarea
            v-model="sourceInput"
            rows="3"
            class="w-full bg-black border border-green-900 text-green-200 p-2 rounded text-sm"
            placeholder="Paste gist IDs or gist URLs, separated by commas or new lines."
          ></textarea>
          <div class="flex items-center justify-between text-xs text-green-600">
            <span>Remote status: {{ remoteStatus }}</span>
            <span v-if="totalRemoteRuns > 0">Remote runs: {{ totalRemoteRuns }}</span>
          </div>
          <p v-if="remoteError" class="text-red-400">Remote error: {{ remoteError }}</p>
        </div>

        <div v-if="topRows.length === 0" class="border border-green-900 rounded p-8 text-center">
          <p class="text-4xl mb-3">🏁</p>
          <p class="text-lg">No ranking data yet.</p>
          <p class="text-green-600 text-sm mt-2">
            Complete Quick, Gauntlet, or Stress runs to populate the leaderboard.
          </p>
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="(row, index) in topRows"
            :key="row.key"
            class="border border-green-900 rounded p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold w-8">#{{ index + 1 }}</span>
                <span
                  class="text-xs px-2 py-1 rounded"
                  :class="
                    row.mode === 'gauntlet'
                      ? 'bg-green-900 text-green-200'
                      : row.mode === 'stress'
                        ? 'bg-cyan-900 text-cyan-200'
                        : 'bg-yellow-900 text-yellow-200'
                  "
                >
                  {{
                    row.mode === 'gauntlet'
                      ? 'Gauntlet'
                      : row.mode === 'stress'
                        ? 'Stress'
                        : 'Quick'
                  }}
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
      </div>
    </div>
  </div>
</template>
