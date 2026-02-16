<script setup lang="ts">
/**
 * SlideTransition.vue - Directional slide animations
 * 
 * Usage:
 * <SlideTransition direction="right" :show="isOpen">
 *   <div>Panel content</div>
 * </SlideTransition>
 */

interface Props {
  show?: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number; // ms
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  direction: 'right',
  duration: 300
});

const axis = props.direction === 'left' || props.direction === 'right' ? 'X' : 'Y';
const sign = props.direction === 'right' || props.direction === 'down' ? '' : '-';
</script>

<template>
  <Transition
    :name="`slide-${direction}`"
    :duration="duration"
  >
    <slot v-if="show" />
  </Transition>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform v-bind(duration + 'ms') ease, opacity v-bind(duration + 'ms') ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
