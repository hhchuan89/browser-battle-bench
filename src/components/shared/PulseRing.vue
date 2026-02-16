<script setup lang="ts">
/**
 * PulseRing.vue - Animated pulse indicator
 * 
 * Usage:
 * <PulseRing :active="isRunning" color="green" />
 */

interface Props {
  active?: boolean;
  color?: 'green' | 'yellow' | 'red' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  color: 'green',
  size: 'md'
});

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
};

const colorMap = {
  green: 'bg-green-500 shadow-green-500/50',
  yellow: 'bg-yellow-500 shadow-yellow-500/50',
  red: 'bg-red-500 shadow-red-500/50',
  cyan: 'bg-cyan-500 shadow-cyan-500/50'
};
</script>

<template>
  <span 
    class="inline-block rounded-full"
    :class="[
      sizeMap[size],
      colorMap[color],
      { 'animate-pulse-ring': active }
    ]"
  />
</template>

<style scoped>
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 currentColor;
    opacity: 0.8;
  }
  70% {
    box-shadow: 0 0 0 6px currentColor;
    opacity: 0;
  }
  100% {
    box-shadow: 0 0 0 0 currentColor;
    opacity: 0;
  }
}

.animate-pulse-ring {
  animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
