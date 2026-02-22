<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ShareResultPayload } from '@/types/share'
import { createShareCardFile } from '@/lib/share/share-card-image'
import {
  buildSocialShareTargets,
  buildSocialShareText,
  type SocialShareTarget,
} from '@/lib/share/social-share'
import type { PublishedShareLinks } from '@/lib/share/publish-types'
import GladiatorGate from '@/components/shared/GladiatorGate.vue'
import { useGladiatorIdentity } from '@/composables/useGladiatorIdentity'
import { resolvePrimaryCtaLabel, type PublishUiState } from '@/lib/share/result-action-state'

const props = withDefaults(
  defineProps<{
    payload: ShareResultPayload
    publishReport?: () => Promise<PublishedShareLinks>
    nextTo?: string
    primaryMode?: 'next' | 'leaderboard' | 'retry'
    primaryLabel?: string
    retryLabel?: string
    showChallengeLink?: boolean
    utilityDownloadLabel?: string
    onUtilityDownload?: () => void | Promise<void>
    showPrimary?: boolean
  }>(),
  {
    nextTo: '',
    primaryMode: 'next',
    primaryLabel: '',
    retryLabel: 'Retry',
    showChallengeLink: true,
    utilityDownloadLabel: '',
    showPrimary: true,
  }
)

const emit = defineEmits<{
  (event: 'published'): void
  (event: 'shared'): void
  (event: 'link-copied'): void
  (event: 'downloaded'): void
  (event: 'next-click', to: string): void
  (event: 'retry-click'): void
  (event: 'error', reason: string): void
}>()

const router = useRouter()
const publishState = ref<PublishUiState>('idle')
const utilityBusy = ref(false)
const statusText = ref('')
const publishedLinks = ref<PublishedShareLinks | null>(null)

const showShareMenu = ref(false)
const isMobile = ref(false)
const desktopSharePopoverRef = ref<HTMLElement | null>(null)
const shareTriggerRef = ref<HTMLElement | null>(null)
const shareContainerRef = ref<HTMLElement | null>(null)

const showIdentityGate = ref(false)
const identityGateResolver = ref<((value: boolean) => void) | null>(null)

const {
  identity: gladiatorIdentity,
  hasGladiatorName,
  reload: reloadIdentity,
  save: saveIdentity,
} = useGladiatorIdentity()

const hasPrimaryRoute = computed(() => Boolean(props.nextTo))
const isPublishing = computed(() => publishState.value === 'publishing')
const isBusy = computed(() => isPublishing.value || utilityBusy.value)

const primaryCtaLabel = computed(() =>
  resolvePrimaryCtaLabel(props.primaryMode, props.primaryLabel)
)

const resolvedShareUrl = computed(
  () => publishedLinks.value?.share_url || props.payload.shareUrl
)

const resolvedCardPayload = computed<ShareResultPayload>(() => ({
  ...props.payload,
  shareUrl: resolvedShareUrl.value,
  challengeUrl: resolvedShareUrl.value,
}))

const socialTargets = computed(() =>
  buildSocialShareTargets(props.payload, resolvedShareUrl.value)
)

const showRetryButton = computed(
  () => props.showPrimary && props.primaryMode !== 'retry' && Boolean(props.retryLabel?.trim())
)

const getCardFile = async (): Promise<File | null> => {
  return createShareCardFile(resolvedCardPayload.value)
}

const closeShareMenu = async () => {
  if (!showShareMenu.value) return
  showShareMenu.value = false
  await nextTick()
  shareTriggerRef.value?.focus()
}

const handleOutsideClick = (event: MouseEvent) => {
  if (!showShareMenu.value || isMobile.value) return
  const target = event.target as Node | null
  if (!target) return

  const inTrigger = shareContainerRef.value?.contains(target)
  const inMenu = desktopSharePopoverRef.value?.contains(target)
  if (inTrigger || inMenu) return

  void closeShareMenu()
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !showShareMenu.value) return
  event.preventDefault()
  void closeShareMenu()
}

const updateViewportMode = () => {
  if (typeof window === 'undefined') return
  isMobile.value = window.matchMedia('(max-width: 767px)').matches
}

onMounted(() => {
  updateViewportMode()
  window.addEventListener('resize', updateViewportMode)
  document.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportMode)
  document.removeEventListener('mousedown', handleOutsideClick)
  document.removeEventListener('keydown', handleEscapeKey)
  if (identityGateResolver.value) {
    const resolver = identityGateResolver.value
    identityGateResolver.value = null
    resolver(false)
  }
})

const copyText = async (text: string): Promise<boolean> => {
  if (!text) return false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // ignore and fallback below
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

const resolveIdentityGate = (value: boolean) => {
  if (!identityGateResolver.value) return
  const resolver = identityGateResolver.value
  identityGateResolver.value = null
  resolver(value)
}

const ensureIdentityReady = async (): Promise<boolean> => {
  reloadIdentity()
  if (hasGladiatorName.value) return true

  showIdentityGate.value = true
  statusText.value = 'Set your Gladiator identity before global publishing.'

  return new Promise<boolean>((resolve) => {
    identityGateResolver.value = resolve
  })
}

const handleIdentityConfirm = (payload: {
  gladiatorName: string
  githubUsername: string
}) => {
  saveIdentity({
    gladiatorName: payload.gladiatorName,
    githubUsername: payload.githubUsername,
  })
  showIdentityGate.value = false
  resolveIdentityGate(true)
}

const handleIdentityCancel = () => {
  showIdentityGate.value = false
  statusText.value = 'Publishing cancelled. Gladiator identity is required.'
  resolveIdentityGate(false)
}

const ensurePublishedShareUrl = async (): Promise<boolean> => {
  if (!props.publishReport || publishedLinks.value) {
    if (publishedLinks.value) {
      publishState.value = publishState.value === 'shared' ? 'shared' : 'published'
    }
    return true
  }

  const identityReady = await ensureIdentityReady()
  if (!identityReady) return false

  publishState.value = 'publishing'
  statusText.value = 'Publishing result...'
  try {
    const links = await props.publishReport()
    publishedLinks.value = links
    publishState.value = 'published'
    statusText.value = 'Published. Continue with share or next challenge.'
    emit('published')
    return true
  } catch (error) {
    publishState.value = 'idle'
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = `Publish failed: ${reason}`
    emit('error', reason)
    return false
  }
}

const goNext = () => {
  if (!props.nextTo) return
  router.push(props.nextTo)
  emit('next-click', props.nextTo)
}

const handlePrimaryAction = async () => {
  if (isBusy.value || !props.showPrimary) return

  if (props.primaryMode === 'retry') {
    emit('retry-click')
    return
  }

  const ready = await ensurePublishedShareUrl()
  if (!ready) return

  if (hasPrimaryRoute.value) {
    statusText.value =
      props.primaryMode === 'leaderboard'
        ? 'Published. Opening Leaderboard...'
        : 'Published. Moving to next challenge...'
    goNext()
  }
}

const handleRetryAction = () => {
  if (isBusy.value) return
  emit('retry-click')
}

const toggleShareMenu = async () => {
  if (isBusy.value) return

  if (showShareMenu.value) {
    await closeShareMenu()
    return
  }

  const ready = await ensurePublishedShareUrl()
  if (!ready) return
  showShareMenu.value = true
  statusText.value = 'Choose a social platform.'
}

const openSocialShare = async (target: SocialShareTarget) => {
  if (isBusy.value) return
  const ready = await ensurePublishedShareUrl()
  if (!ready) return

  let copied = false
  if (!target.prefillSupported) {
    copied = await copyText(target.composeText)
  }

  const popup = window.open(target.url, '_blank', 'noopener,noreferrer')
  if (!popup) {
    const reason = 'Unable to open share window. Please allow popups for this site.'
    statusText.value = reason
    emit('error', reason)
    return
  }

  publishState.value = 'shared'
  await closeShareMenu()
  if (target.prefillSupported) {
    statusText.value = `Opened ${target.label}.`
  } else {
    statusText.value = copied
      ? `Opened ${target.label}. Caption + link copied.`
      : `Opened ${target.label}. Use copy link as fallback.`
  }
  emit('shared')
}

const copyShareLink = async () => {
  const ready = await ensurePublishedShareUrl()
  if (!ready) return
  const ok = await copyText(resolvedShareUrl.value)
  statusText.value = ok ? 'Share link copied.' : 'Failed to copy share link.'
  if (ok) emit('link-copied')
}

const copyChallengeLink = async () => {
  const ok = await copyText(props.payload.challengeUrl)
  statusText.value = ok ? 'Challenge link copied.' : 'Failed to copy challenge link.'
  if (ok) emit('link-copied')
}

const downloadCard = async () => {
  utilityBusy.value = true
  try {
    const file = await getCardFile()
    if (!file) throw new Error('Unable to generate share card image')
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    statusText.value = 'Share card downloaded.'
    emit('downloaded')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = reason
    emit('error', reason)
  } finally {
    utilityBusy.value = false
  }
}

const runUtilityDownload = async () => {
  if (!props.onUtilityDownload || isBusy.value) return
  utilityBusy.value = true
  try {
    await props.onUtilityDownload()
    statusText.value = `${props.utilityDownloadLabel || 'Report'} downloaded.`
    emit('downloaded')
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = `Download failed: ${reason}`
    emit('error', reason)
  } finally {
    utilityBusy.value = false
  }
}

const shareTextPreview = computed(() => buildSocialShareText(props.payload))
</script>

<template>
  <div class="space-y-3">
    <GladiatorGate
      :open="showIdentityGate"
      :busy="isBusy"
      :initial-name="gladiatorIdentity.gladiator_name"
      :initial-github="gladiatorIdentity.github_username || ''"
      @confirm="handleIdentityConfirm"
      @cancel="handleIdentityCancel"
    />

    <div v-if="showPrimary" class="grid grid-cols-1 sm:grid-cols-12 gap-2">
      <button
        class="btn btn-accent btn-sm sm:col-span-8 font-bold"
        :disabled="isBusy"
        @click="void handlePrimaryAction()"
      >
        {{ primaryCtaLabel }}
      </button>
      <button
        v-if="showRetryButton"
        class="btn btn-outline btn-sm sm:col-span-4"
        :disabled="isBusy"
        @click="handleRetryAction"
      >
        {{ retryLabel }}
      </button>
    </div>

    <div class="relative" ref="shareContainerRef">
      <div class="flex flex-wrap gap-2">
        <button
          ref="shareTriggerRef"
          class="btn btn-primary btn-sm"
          :disabled="isBusy"
          :aria-expanded="showShareMenu"
          aria-haspopup="dialog"
          @click="void toggleShareMenu()"
        >
          Share Results
        </button>
        <button
          v-if="showChallengeLink"
          class="btn btn-outline btn-sm"
          :disabled="isBusy"
          @click="void copyChallengeLink()"
        >
          Challenge a Friend
        </button>
      </div>

      <div
        v-if="showShareMenu && !isMobile"
        ref="desktopSharePopoverRef"
        class="absolute left-0 top-full z-50 mt-2 w-[min(520px,92vw)] rounded-lg border border-base-300 bg-base-200 p-3 shadow-2xl"
        role="dialog"
        aria-label="Share targets"
      >
        <p class="text-xs font-semibold mb-1">Share to Social</p>
        <p class="text-[11px] text-base-content/60 mb-2">{{ shareTextPreview }}</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="target in socialTargets"
            :key="target.id"
            class="btn btn-outline btn-xs"
            @click="void openSocialShare(target)"
          >
            <span class="font-bold">{{ target.icon }}</span>
            {{ target.label }}
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showShareMenu && isMobile"
        class="fixed inset-0 z-[70] bg-black/70"
        role="dialog"
        aria-modal="true"
      >
        <button
          class="absolute inset-0 cursor-default"
          aria-label="Close share menu"
          @click="void closeShareMenu()"
        />
        <div class="absolute bottom-0 left-0 right-0 rounded-t-xl border border-base-300 bg-base-200 p-4 shadow-2xl">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-semibold">Share to Social</p>
            <button class="btn btn-ghost btn-xs" @click="void closeShareMenu()">
              Close
            </button>
          </div>
          <p class="text-xs text-base-content/60 mb-3">{{ shareTextPreview }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="target in socialTargets"
              :key="target.id"
              class="btn btn-outline btn-sm justify-start"
              @click="void openSocialShare(target)"
            >
              <span class="font-bold">{{ target.icon }}</span>
              {{ target.label }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <button class="link link-hover" :disabled="isBusy" @click="void copyShareLink()">
        Copy Link
      </button>
      <button class="link link-hover" :disabled="isBusy" @click="void downloadCard()">
        Download Card
      </button>
      <button
        v-if="onUtilityDownload && utilityDownloadLabel"
        class="link link-hover"
        :disabled="isBusy"
        @click="void runUtilityDownload()"
      >
        {{ utilityDownloadLabel }}
      </button>
    </div>

    <p v-if="statusText" class="text-xs text-base-content/70">
      {{ statusText }}
    </p>
  </div>
</template>
