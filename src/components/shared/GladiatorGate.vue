<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    initialName?: string
    initialGithub?: string
    busy?: boolean
  }>(),
  {
    open: false,
    initialName: '',
    initialGithub: '',
    busy: false,
  }
)

const emit = defineEmits<{
  (event: 'confirm', payload: { gladiatorName: string; githubUsername: string }): void
  (event: 'cancel'): void
}>()

const gladiatorName = ref(props.initialName)
const githubUsername = ref(props.initialGithub)
const touched = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) {
      touched.value = false
      return
    }
    gladiatorName.value = props.initialName
    githubUsername.value = props.initialGithub
  }
)

const trimmedName = computed(() => gladiatorName.value.trim())
const nameError = computed(() => {
  if (!touched.value) return ''
  if (!trimmedName.value) return 'Gladiator name is required.'
  if (trimmedName.value.length < 2) return 'Use at least 2 characters.'
  if (trimmedName.value.length > 32) return 'Max length is 32 characters.'
  return ''
})

const githubError = computed(() => {
  const normalized = githubUsername.value.trim().replace(/^@+/, '')
  if (!normalized) return ''
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(normalized)) {
    return 'GitHub username format is invalid.'
  }
  if (normalized.length > 39) {
    return 'GitHub username max length is 39.'
  }
  return ''
})

const canSubmit = computed(
  () =>
    !props.busy &&
    trimmedName.value.length >= 2 &&
    trimmedName.value.length <= 32 &&
    !githubError.value
)

const submit = () => {
  touched.value = true
  if (!canSubmit.value) return
  emit('confirm', {
    gladiatorName: trimmedName.value,
    githubUsername: githubUsername.value.trim(),
  })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
    <div class="w-full max-w-md rounded-lg border border-green-700 bg-black p-5 text-green-300 shadow-2xl">
      <h3 class="mb-1 text-lg font-bold text-green-400">Claim Your Glory</h3>
      <p class="mb-4 text-xs text-green-600">
        Global publish requires a Gladiator name.
      </p>

      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold">Gladiator Name *</span>
          <input
            v-model="gladiatorName"
            class="w-full rounded border border-green-700 bg-black px-3 py-2 text-sm text-green-100 focus:border-green-500 focus:outline-none"
            maxlength="32"
            placeholder="NeoQuant"
            :disabled="busy"
            @blur="touched = true"
          />
          <p v-if="nameError" class="mt-1 text-xs text-red-400">{{ nameError }}</p>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs font-semibold">GitHub Username (optional)</span>
          <input
            v-model="githubUsername"
            class="w-full rounded border border-green-700 bg-black px-3 py-2 text-sm text-green-100 focus:border-green-500 focus:outline-none"
            maxlength="39"
            placeholder="@hhchuan89"
            :disabled="busy"
          />
          <p v-if="githubError" class="mt-1 text-xs text-red-400">{{ githubError }}</p>
        </label>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          class="btn btn-ghost btn-sm"
          :disabled="busy"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary btn-sm"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ busy ? 'Publishing...' : 'Continue' }}
        </button>
      </div>
    </div>
  </div>
</template>
