<template>
  <div class="battle-arena w-full max-w-6xl mx-auto p-4">
    <!-- Header: Progress & Score -->
    <div class="bg-base-200 rounded-lg p-4 mb-4 border border-base-300">
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-bold text-primary flex items-center gap-2">
          {{ isComplete ? '🏆 BATTLE COMPLETE' : '⚔️ BATTLE ARENA' }}
        </h2>
        <div class="text-right">
          <span class="text-2xl font-mono font-bold" :class="scoreColorClass">
            <CountUp :value="displayScore" />
          </span>
          <span class="text-sm text-base-content/60">/{{ battleStore.session.maxPossibleScore }}</span>
          <p v-if="hasTimeLimit" class="text-xs mt-1">
            Time Left:
            <span class="font-bold" :class="timeRemainingClass">
              {{ remainingSeconds ?? timeLimitSeconds }}s
            </span>
          </p>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="w-full bg-base-300 rounded-full h-4 overflow-hidden border border-base-content/10">
        <div 
          class="h-full transition-all duration-700 ease-out relative"
          :class="progressColorClass"
          :style="{ width: progressPercent + '%' }"
        >
          <div class="absolute inset-0 bg-white/20 animate-shimmer"></div>
        </div>
      </div>
      <div class="flex justify-between text-xs text-base-content/60 mt-1">
        <span>Round {{ currentRound }} / {{ totalRounds }}</span>
        <span>{{ progressPercent }}%</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Main: Current Question & Output -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Current Challenge Card with Flip Animation -->
        <div v-if="currentChallenge && !isComplete" class="challenge-card-container">
          <div 
            class="challenge-card"
            :class="{ 'is-flipping': isFlipping }"
          >
            <div class="card bg-base-100 shadow-xl border border-base-300 challenge-card-inner">
              <div class="card-body">
                <div class="flex items-center gap-2 mb-2">
                  <span 
                    class="badge"
                    :class="currentChallenge.type === 'control' ? 'badge-success' : 'badge-warning'"
                  >
                    {{ currentChallenge.type === 'control' ? 'CONTROL' : 'TRAP' }}
                  </span>
                  <span class="badge badge-ghost">{{ currentChallenge.category }}</span>
                  <span class="text-xs text-base-content/60 ml-auto">{{ currentChallenge.id }}</span>
                </div>
                <h3 class="text-sm font-semibold text-base-content/70 mb-2">Current Challenge:</h3>
                <p class="text-sm whitespace-pre-wrap font-mono bg-base-200 p-3 rounded challenge-text">{{ currentChallenge.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Output Terminal -->
        <div class="card bg-black shadow-xl border border-gray-800">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-green-500 font-mono flex items-center gap-2">
                MODEL OUTPUT
                <PulseRing v-if="isProcessing" color="green" size="sm" :active="true" />
              </span>
              <span v-if="isProcessing" class="loading loading-dots loading-xs text-green-500"></span>
            </div>
            <pre class="text-green-400 font-mono text-sm overflow-x-auto whitespace-pre-wrap min-h-[150px] max-h-[300px] transition-all duration-300">{{ currentOutput || '[Waiting for output...]' }}</pre>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button 
            v-if="canStart && !isFighting"
            class="btn btn-primary flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            @click="startBattle"
          >
            <span class="text-lg mr-2">{{ isQuickMode ? '⚡' : '⚔️' }}</span>
            {{ isQuickMode ? 'Start Quick Battle' : 'Start Logic Battle' }}
          </button>
          <button 
            v-if="isFighting"
            class="btn btn-error flex-1 transition-all duration-200"
            @click="resetBattle"
          >
            <span class="text-lg mr-2">⏹️</span> Abort Battle
          </button>
          <button 
            v-if="isComplete"
            class="btn btn-secondary flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            @click="resetBattle"
          >
            <span class="text-lg mr-2">🔄</span> New Battle
          </button>
        </div>

        <!-- Error Display -->
        <FadeTransition :show="!!battleStore.session.errorMessage" :duration="300">
          <div v-if="battleStore.session.errorMessage" class="alert alert-error">
            <span class="text-lg">⚠️</span>
            <span>{{ battleStore.session.errorMessage }}</span>
          </div>
        </FadeTransition>

        <FadeTransition :show="timedOut" :duration="300">
          <div
            v-if="timedOut"
            class="alert border border-warning/50 bg-warning/10 text-warning-content"
          >
            <span class="text-lg">⏱️</span>
            <span>Quick Battle reached time limit and was auto-stopped.</span>
          </div>
        </FadeTransition>
      </div>

      <!-- Sidebar: Round History -->
      <div class="space-y-4">
        <div class="card bg-base-100 shadow-xl border border-base-300">
          <div class="card-body p-4">
            <h3 class="font-bold mb-3 flex items-center gap-2">
              📊 Round History
              <span v-if="results.length > 0" class="badge badge-sm">
                {{ results.filter(r => r.passed).length }}/{{ results.length }}
              </span>
            </h3>
            
            <div v-if="results.length === 0" class="text-center text-base-content/50 py-4">
              No rounds completed yet
            </div>
            
            <div v-else class="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
              <FadeTransition 
                v-for="(result, index) in results" 
                :key="result.challengeId"
                :show="true"
                :duration="300"
              >
                <div 
                  class="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                  :class="result.passed ? 'bg-success/10 hover:bg-success/20' : 'bg-error/10 hover:bg-error/20'"
                >
                  <div class="text-lg">
                    {{ result.passed ? '✅' : '❌' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">
                      Round {{ index + 1 }}: {{ getChallengeDescription(result.challengeId) }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      Score: {{ result.score }} | {{ formatDuration(result.durationMs) }}
                    </div>
                    <div v-if="!result.passed && result.failureReason" class="text-xs text-error mt-1">
                      {{ result.failureReason }}
                    </div>
                  </div>
                </div>
              </FadeTransition>
            </div>
          </div>
        </div>

        <!-- Scenario Selector -->
        <div
          v-if="scenarioCatalog.length > 1"
          class="card bg-base-100 shadow-xl border border-base-300"
        >
          <div class="card-body p-4">
            <h3 class="font-bold mb-3">🎯 Select Scenario</h3>
            <div class="space-y-2">
              <button
                v-for="scenario in scenarioCatalog"
                :key="scenario.id"
                class="btn btn-sm w-full justify-start transition-all duration-200"
                :class="selectedScenario?.id === scenario.id ? 'btn-primary' : 'btn-ghost hover:btn-ghost hover:bg-base-200'"
                @click="selectedScenario = scenario"
                :disabled="isFighting"
              >
                <div class="text-left">
                  <div class="font-medium">{{ scenario.name }}</div>
                  <div class="text-xs opacity-70">{{ scenario.totalChallenges }} challenges</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Final Score Modal with Celebration -->
    <FadeTransition :show="isComplete && showResults" :duration="500">
      <div v-if="isComplete && showResults" class="modal modal-open">
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-2xl mb-4 text-center">🏆 Battle Complete!</h3>
          
          <!-- Score Display with Animation -->
          <div class="text-center mb-6">
            <div 
              class="text-6xl font-bold transition-all duration-500"
              :class="finalScoreClass"
            >
              <CountUp 
                :value="Math.round((battleStore.session.totalScore / battleStore.session.maxPossibleScore) * 100)" 
                suffix="%"
                :duration="1000"
              />
            </div>
            <p class="text-lg mt-2">
              {{ battleStore.session.totalScore }} / {{ battleStore.session.maxPossibleScore }} points
            </p>
            <p class="text-base-content/70 mt-1">
              {{ correctCount }} correct out of {{ totalRounds }} rounds
            </p>
            
            <!-- Performance Badge -->
            <div class="mt-4">
              <div 
                class="inline-block px-4 py-2 rounded-full text-lg font-bold animate-bounce"
                :class="performanceBadgeClass"
              >
                {{ performanceBadge }}
              </div>
            </div>
          </div>

          <div class="mb-4">
            <ShareResultActions
              v-if="battleSharePayload"
              :payload="battleSharePayload"
              :publish-report="publishBattleShare"
              :show-next="true"
              :next-label="nextLabel"
              :next-to="battleSharePayload.nextRoute || ''"
            />
            <p v-if="stressBlockedHint" class="text-xs text-warning text-center mt-2">
              {{ stressBlockedHint }}
            </p>
          </div>
          
          <div class="modal-action justify-center">
            <button class="btn btn-primary" @click="showResults = false">Close</button>
            <button class="btn btn-accent" @click="downloadBBBReportBundle">Download BBB Report</button>
            <button class="btn btn-secondary" @click="resetAndStart">Battle Again</button>
          </div>
        </div>
      </div>
    </FadeTransition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBattleStore } from '../stores/battleStore';
import { useSystemStore } from '../stores/systemStore';
import { logicTrapsLevel1, logicTrapsGrouped } from '../data/traps';
import type { BattleScenario } from '../types/battle';
import { isScenarioCompatibleForArenaView } from '@/lib/battle-session';
import { loadHardwareSnapshot } from '@/lib/hardware-snapshot';
import { getSelectedModelId } from '@/lib/settings-store';
import { buildBattleSharePayload } from '@/lib/share/share-payload';
import { publishReport } from '@/lib/share/publish-report';
import { buildBattlePublishRequest } from '@/lib/share/publish-normalizers';
import type { PublishedShareLinks } from '@/lib/share/publish-types';
import { loadGladiatorIdentity } from '@/composables/useGladiatorIdentity';
import CountUp from './shared/CountUp.vue';
import FadeTransition from './shared/FadeTransition.vue';
import PulseRing from './shared/PulseRing.vue';
import ShareResultActions from './shared/ShareResultActions.vue';

interface BattleArenaProps {
  scenarios?: BattleScenario[];
  defaultScenarioId?: string;
  mode?: 'gauntlet' | 'quick';
  timeLimitSeconds?: number;
}

const props = withDefaults(defineProps<BattleArenaProps>(), {
  scenarios: () => [logicTrapsLevel1, logicTrapsGrouped],
  defaultScenarioId: '',
  mode: 'gauntlet',
  timeLimitSeconds: 0,
});

const battleStore = useBattleStore();
const systemStore = useSystemStore();
const showResults = ref(true);
const isFlipping = ref(false);
const displayScore = ref(0);
const timedOut = ref(false);
const remainingSeconds = ref<number | null>(null);
const shareRunRef = ref<string | null>(null);
const publishedShareLinks = ref<PublishedShareLinks | null>(null);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const scenarioCatalog = computed<BattleScenario[]>(() =>
  props.scenarios.length > 0 ? props.scenarios : [logicTrapsLevel1, logicTrapsGrouped]
);

const resolveScenarioSelection = (): BattleScenario => {
  if (props.defaultScenarioId) {
    const matched = scenarioCatalog.value.find((scenario) => scenario.id === props.defaultScenarioId);
    if (matched) return matched;
  }
  return scenarioCatalog.value[0];
};

const selectedScenario = ref<BattleScenario>(resolveScenarioSelection());

watch(
  () => [scenarioCatalog.value, props.defaultScenarioId] as const,
  () => {
    if (!isFighting.value) {
      selectedScenario.value = resolveScenarioSelection();
    }
  },
  { deep: true }
);

const currentChallenge = computed(() => battleStore.currentChallenge);
const currentOutput = computed(() => systemStore.outputStream);
const isProcessing = computed(() => battleStore.isProcessingRound);
const isFighting = computed(() => battleStore.session.status === 'FIGHTING');
const isComplete = computed(() => battleStore.session.status === 'COMPLETE');
const canStart = computed(() => battleStore.canStart);
const results = computed(() => battleStore.session.results);
const isQuickMode = computed(() => props.mode === 'quick');
const hasTimeLimit = computed(
  () => isQuickMode.value && Number.isFinite(props.timeLimitSeconds) && props.timeLimitSeconds > 0
);
const timeLimitSeconds = computed(() =>
  hasTimeLimit.value ? Math.round(props.timeLimitSeconds) : 0
);
const allChallenges = computed(() =>
  scenarioCatalog.value.flatMap((scenario) => scenario.challenges)
);

const hardwareSnapshot = computed(() => loadHardwareSnapshot());
const isStressBlocked = computed(
  () =>
    props.mode === 'gauntlet' &&
    (hardwareSnapshot.value?.tier === 'M' || hardwareSnapshot.value?.tier === 'F')
);
const hardwareLabel = computed(() =>
  hardwareSnapshot.value ? `GPU: ${hardwareSnapshot.value.gpu}` : 'GPU: Unknown'
);
const nextLabel = computed(() =>
  props.mode === 'gauntlet' && isStressBlocked.value
    ? 'Next: Leaderboard'
    : 'Next Challenge'
);
const stressBlockedHint = computed(() =>
  props.mode === 'gauntlet' && isStressBlocked.value
    ? 'Stress blocked on this device tier (M/F), skipping to Leaderboard.'
    : ''
);

const battleSharePayload = computed(() => {
  if (!isComplete.value || !battleStore.currentScenario || results.value.length === 0) {
    return null;
  }
  if (props.mode !== 'quick' && props.mode !== 'gauntlet') {
    return null;
  }

  const scenario = battleStore.currentScenario;
  const runRef =
    battleStore.latestReportBundle?.report.run_hash ||
    shareRunRef.value ||
    `${props.mode}-${Date.now()}`;

  return buildBattleSharePayload({
    mode: props.mode,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    modelId: getSelectedModelId(),
    runRef,
    results: results.value,
    hardwareLabel: hardwareLabel.value,
    stressBlocked: isStressBlocked.value,
  });
});

const publishBattleShare = async (): Promise<PublishedShareLinks> => {
  if (publishedShareLinks.value) return publishedShareLinks.value;
  if (!battleSharePayload.value) {
    throw new Error('Battle result is not ready for publishing.');
  }

  let report = battleStore.latestReportBundle?.report || null;
  if (!report) {
    await battleStore.generateReportBundle();
    report = battleStore.latestReportBundle?.report || null;
  }
  if (!report) {
    throw new Error('Unable to generate battle report for publishing.');
  }

  const request = buildBattlePublishRequest({
    payload: battleSharePayload.value,
    report,
    identity: loadGladiatorIdentity(),
    hardware: hardwareSnapshot.value,
    tier: hardwareSnapshot.value?.tier,
  });
  const links = await publishReport(request);
  publishedShareLinks.value = links;
  return links;
};

const getAllowedScenarioIds = () => scenarioCatalog.value.map((scenario) => scenario.id);

const ensureModeScopedSession = () => {
  if (
    !isScenarioCompatibleForArenaView(
      battleStore.currentScenario,
      props.mode,
      getAllowedScenarioIds()
    )
  ) {
    battleStore.resetBattle();
    selectedScenario.value = resolveScenarioSelection();
  }
};

const currentRound = computed(() => {
  if (isComplete.value) return battleStore.session.results.length;
  return battleStore.session.currentIndex + 1;
});

const totalRounds = computed(() => {
  return battleStore.currentScenario?.totalChallenges || selectedScenario.value.totalChallenges;
});

const progressPercent = computed(() => {
  if (totalRounds.value === 0) return 0;
  return Math.round((battleStore.session.currentIndex / totalRounds.value) * 100);
});

const correctCount = computed(() => {
  return results.value.filter((entry) => entry.passed).length;
});

const progressColorClass = computed(() => {
  const pct = progressPercent.value;
  if (pct < 30) return 'bg-error';
  if (pct < 70) return 'bg-warning';
  return 'bg-success';
});

const scoreColorClass = computed(() => {
  if (!battleStore.session.maxPossibleScore) return 'text-base-content';
  const pct = battleStore.session.totalScore / battleStore.session.maxPossibleScore;
  if (pct < 0.5) return 'text-error';
  if (pct < 0.8) return 'text-warning';
  return 'text-success';
});

const finalScoreClass = computed(() => {
  const pct = battleStore.session.totalScore / battleStore.session.maxPossibleScore;
  if (pct >= 0.9) return 'text-success animate-pulse';
  if (pct >= 0.7) return 'text-warning';
  return 'text-error';
});

const performanceBadge = computed(() => {
  const pct = battleStore.session.totalScore / battleStore.session.maxPossibleScore;
  if (pct >= 0.95) return '🏅 Legendary!';
  if (pct >= 0.85) return '🥈 Expert!';
  if (pct >= 0.70) return '🥉 Skilled!';
  if (pct >= 0.50) return '💪 Solid';
  return '📚 Needs Practice';
});

const performanceBadgeClass = computed(() => {
  const pct = battleStore.session.totalScore / battleStore.session.maxPossibleScore;
  if (pct >= 0.95) return 'bg-success text-white';
  if (pct >= 0.85) return 'bg-warning text-black';
  if (pct >= 0.70) return 'bg-info text-white';
  if (pct >= 0.50) return 'bg-base-300';
  return 'bg-error text-white';
});

const timeRemainingClass = computed(() => {
  if (!hasTimeLimit.value || remainingSeconds.value === null) return 'text-base-content';
  if (remainingSeconds.value <= 5) return 'text-error';
  if (remainingSeconds.value <= 10) return 'text-warning';
  return 'text-success';
});

const clearCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

const resetCountdown = () => {
  if (!hasTimeLimit.value) {
    remainingSeconds.value = null;
    return;
  }
  remainingSeconds.value = timeLimitSeconds.value;
};

const startCountdown = () => {
  if (!hasTimeLimit.value) return;
  clearCountdown();
  timedOut.value = false;
  resetCountdown();

  const startedAt = Date.now();
  countdownTimer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const nextSeconds = Math.max(0, timeLimitSeconds.value - elapsedSeconds);
    remainingSeconds.value = nextSeconds;

    if (nextSeconds <= 0) {
      timedOut.value = true;
      clearCountdown();
      battleStore.stopBattle(`Quick Battle timeout (${timeLimitSeconds.value}s).`);
    }
  }, 250);
};

watch(
  () => battleStore.session.totalScore,
  (newScore) => {
    displayScore.value = newScore;
  },
  { immediate: true }
);

watch(() => battleStore.session.currentIndex, () => {
  if (isFighting.value) {
    isFlipping.value = true;
    setTimeout(() => {
      isFlipping.value = false;
    }, 300);
  }
});

watch(isFighting, (fighting) => {
  if (fighting) {
    startCountdown();
    return;
  }
  clearCountdown();
  if (!timedOut.value) {
    resetCountdown();
  }
});

watch(
  () => props.timeLimitSeconds,
  () => {
    if (!isFighting.value) {
      resetCountdown();
    }
  }
);

function startBattle() {
  showResults.value = true;
  timedOut.value = false;
  resetCountdown();
  publishedShareLinks.value = null;
  battleStore.startBattle(selectedScenario.value);
}

function resetBattle() {
  timedOut.value = false;
  clearCountdown();
  shareRunRef.value = null;
  publishedShareLinks.value = null;
  battleStore.resetBattle();
  resetCountdown();
}

function resetAndStart() {
  resetBattle();
  setTimeout(() => startBattle(), 100);
}

function getChallengeDescription(challengeId: string): string {
  const challenge = allChallenges.value.find((entry) => entry.id === challengeId);
  return challenge?.description.substring(0, 30) + '...' || challengeId;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadBBBReportBundle() {
  const existingBundle = battleStore.exportLatestReportBundle();
  const bundle = existingBundle ?? (await battleStore.generateReportBundle(), battleStore.exportLatestReportBundle());
  if (!bundle) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  triggerDownload(`bbb-report-${timestamp}.json`, bundle.reportJson);
  triggerDownload(`bbb-raw-outputs-${timestamp}.json`, bundle.rawOutputsJson);
}

watch(isComplete, (complete) => {
  if (complete) {
    if (!shareRunRef.value) {
      shareRunRef.value = `${props.mode}-${Date.now()}`;
    }
    showResults.value = true;
  }
});

watch(
  () => props.mode,
  () => {
    if (!isFighting.value) {
      ensureModeScopedSession();
    }
  }
);

onMounted(() => {
  ensureModeScopedSession();
});

onBeforeUnmount(() => {
  clearCountdown();
});
</script>

<style scoped>
.battle-arena {
  min-height: 600px;
}

/* Challenge Card Flip Animation */
.challenge-card-container {
  perspective: 1000px;
}

.challenge-card {
  transition: transform 0.3s ease;
}

.challenge-card.is-flipping .challenge-card-inner {
  animation: cardFlip 0.3s ease;
}

@keyframes cardFlip {
  0% {
    transform: rotateX(0deg);
    opacity: 1;
  }
  50% {
    transform: rotateX(10deg);
    opacity: 0.7;
  }
  100% {
    transform: rotateX(0deg);
    opacity: 1;
  }
}

/* Shimmer effect for progress bar */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.3);
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: rgba(75, 85, 99, 0.5);
}

/* Challenge text animation */
.challenge-text {
  transition: all 0.3s ease;
}
</style>
