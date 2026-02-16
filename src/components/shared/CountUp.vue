<script setup lang="ts">
/**
 * CountUp.vue - Animated Number Counter
 * 
 * Provides smooth animated counting between number values.
 * Used for score displays, statistics, and progress indicators.
 * 
 * @example
 * <CountUp :value="score" suffix=" pts" />
 * <CountUp :value="percentage" suffix="%" :duration="1000" />
 */

import { ref, watch, onMounted, computed } from 'vue';

interface CountUpProps {
  /** The target value to animate to */
  value: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Suffix to display after the number */
  suffix?: string;
  /** Prefix to display before the number */
  prefix?: string;
}

const props = withDefaults(defineProps<CountUpProps>(), {
  duration: 600,
  suffix: '',
  prefix: ''
});

const displayValue = ref(props.value);
const isAnimating = ref(false);

/**
 * Watch for value changes and trigger animation
 */
watch(() => props.value, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  animateCount(oldVal, newVal);
});

/**
 * Animate counting from one value to another
 * Uses ease-out cubic for smooth deceleration
 */
function animateCount(from: number, to: number) {
  isAnimating.value = true;
  const startTime = performance.now();
  const duration = props.duration;

  /**
   * Animation frame callback
   */
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic: smooth deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    displayValue.value = Math.round(from + (to - from) * easeProgress);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      isAnimating.value = false;
    }
  }

  requestAnimationFrame(update);
}

onMounted(() => {
  displayValue.value = props.value;
});

/**
 * Formatted display value with prefix and suffix
 */
const formattedValue = computed(() => {
  return `${props.prefix}${displayValue.value}${props.suffix}`;
});
</script>

<template>
  <span :class="{ 'count-animating': isAnimating }">{{ formattedValue }}</span>
</template>

<style scoped>
.count-animating {
  color: inherit;
}
</style>
