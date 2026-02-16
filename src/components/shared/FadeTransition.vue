<script setup lang="ts">
/**
 * FadeTransition.vue - Smooth opacity transitions
 * 
 * Usage:
 * <FadeTransition :show="isVisible">
 *   <div>Content</div>
 * </FadeTransition>
 */

interface Props {
  show?: boolean;
  duration?: number; // ms
}

withDefaults(defineProps<Props>(), {
  show: true,
  duration: 300
});
</script>

<template>
  <Transition
    name="fade"
    :duration="duration"
  >
    <slot v-if="show" />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity v-bind(duration + 'ms') ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
