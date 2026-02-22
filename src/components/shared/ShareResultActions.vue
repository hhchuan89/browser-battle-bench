<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ShareResultPayload } from '@/types/share'
import { createShareCardFile } from '@/lib/share/share-card-image'
import {
  buildSocialShareTargets,
  type SocialShareTarget,
} from '@/lib/share/social-share'
import type { PublishedShareLinks } from '@/lib/share/publish-types'
import GladiatorGate from '@/components/shared/GladiatorGate.vue'
import { useGladiatorIdentity } from '@/composables/useGladiatorIdentity'

const props = withDefaults(
  defineProps<{
    payload: ShareResultPayload
    showNext?: boolean
    nextLabel?: string
    nextTo?: string
    publishReport?: () => Promise<PublishedShareLinks>
  }>(),
  {
    showNext: false,
    nextLabel: 'Next Challenge',
    nextTo: '',
  }
)

const emit = defineEmits<{
  (event: 'shared'): void
  (event: 'link-copied'): void
  (event: 'downloaded'): void
  (event: 'next-click', to: string): void
  (event: 'error', reason: string): void
}>()

const router = useRouter()
const isBusy = ref(false)
const statusText = ref('')
const showSocialMenu = ref(false)
const publishedLinks = ref<PublishedShareLinks | null>(null)
const showIdentityGate = ref(false)
const identityGateResolver = ref<((value: boolean) => void) | null>(null)
const {
  identity: gladiatorIdentity,
  hasGladiatorName,
  reload: reloadIdentity,
  save: saveIdentity,
} = useGladiatorIdentity()

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
const hasNextRoute = computed(() => Boolean(props.showNext && props.nextTo))
const publishNextLabel = computed(() =>
  props.payload.mode === 'stress'
    ? 'Publish to Leaderboard'
    : 'Publish and Next Challenge'
)

const getCardFile = async (): Promise<File | null> => {
  return createShareCardFile(resolvedCardPayload.value)
}

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

const downloadCard = async () => {
  isBusy.value = true
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
    isBusy.value = false
  }
}

const copyChallengeLink = async () => {
  const ok = await copyText(props.payload.challengeUrl)
  statusText.value = ok ? 'Challenge link copied.' : 'Failed to copy challenge link.'
  showSocialMenu.value = false
  if (ok) emit('link-copied')
}

const copyShareLink = async () => {
  const ready = await ensurePublishedShareUrl()
  if (!ready) return
  const ok = await copyText(resolvedShareUrl.value)
  statusText.value = ok ? 'Share link copied.' : 'Failed to copy share link.'
  showSocialMenu.value = false
  if (ok) emit('link-copied')
}

const resolveIdentityGate = (value: boolean) => {
  if (!identityGateResolver.value) return
  const resolver = identityGateResolver.value
  identityGateResolver.value = null
  resolver(value)
}

onBeforeUnmount(() => {
  resolveIdentityGate(false)
})

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
  if (!props.publishReport || publishedLinks.value) return true

  const identityReady = await ensureIdentityReady()
  if (!identityReady) return false

  isBusy.value = true
  statusText.value = 'Publishing result...'
  try {
    const links = await props.publishReport()
    publishedLinks.value = links
    statusText.value = 'Published. Choose a social platform.'
    return true
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    statusText.value = `Publish failed: ${reason}`
    emit('error', reason)
    return false
  } finally {
    isBusy.value = false
  }
}

const toggleSocialShareMenu = async () => {
  if (isBusy.value) return
  if (showSocialMenu.value) {
    showSocialMenu.value = false
    statusText.value = ''
    return
  }

  const ready = await ensurePublishedShareUrl()
  if (!ready) return
  showSocialMenu.value = true
  if (!statusText.value) {
    statusText.value = 'Choose a social platform.'
  }
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

  showSocialMenu.value = false
  if (target.prefillSupported) {
    statusText.value = `Opened ${target.label}. Preview image should load automatically from the share link.`
  } else {
    statusText.value = copied
      ? `Opened ${target.label}. Caption + link copied. Upload card manually in app.`
      : `Opened ${target.label}. Use Download Card and paste caption manually.`
  }
  emit('shared')
}

const goNext = () => {
  if (!props.nextTo) return
  showSocialMenu.value = false
  router.push(props.nextTo)
  emit('next-click', props.nextTo)
}

const publishAndGoNext = async () => {
  if (isBusy.value || !hasNextRoute.value) return
  const ready = await ensurePublishedShareUrl()
  if (!ready) return
  statusText.value =
    props.payload.mode === 'stress'
      ? 'Published. Opening Leaderboard...'
      : 'Published. Moving to next challenge...'
  goNext()
}
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
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <button
        v-if="hasNextRoute"
        class="btn btn-accent btn-sm sm:col-span-2 lg:col-span-1"
        :disabled="isBusy"
        @click="void publishAndGoNext()"
      >
        {{ publishNextLabel }}
      </button>
      <button
        class="btn btn-primary btn-sm"
        :disabled="isBusy"
        @click="void toggleSocialShareMenu()"
      >
        Share
      </button>
      <button
        class="btn btn-secondary btn-sm"
        :disabled="isBusy"
        @click="copyChallengeLink"
      >
        Challenge a Friend
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="isBusy"
        @click="void copyShareLink()"
      >
        Copy Link
      </button>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="isBusy"
        @click="downloadCard"
      >
        Download Card
      </button>
    </div>
    <div
      v-if="showSocialMenu"
      class="rounded-lg border border-base-300 p-3 bg-base-200/50"
    >
      <p class="text-xs font-semibold mb-2">Social Media Share</p>
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
      <p class="text-[11px] text-base-content/60 mt-2">
        If a social window does not open, allow popups and retry.
      </p>
    </div>
    <p v-if="statusText" class="text-xs text-base-content/70">
      {{ statusText }}
    </p>
  </div>
</template>
