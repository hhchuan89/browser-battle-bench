<script setup lang="ts">
/**
 * Transitions.vue - Reusable Animation Components
 * 
 * A comprehensive animation library providing smooth transitions for:
 * - Tab switching
 * - Modal dialogs
 * - Panel expansions
 * - Number counting
 * - Page elements
 * 
 * @example
 * <!-- Fade transition -->
 * <FadeTransition :show="isVisible">
 *   <div>Content fades in/out</div>
 * </FadeTransition>
 * 
 * <!-- Slide transition -->
 * <SlideTransition direction="right" :show="isOpen">
 *   <div>Content slides from right</div>
 * </SlideTransition>
 */

import { ref, watch, onMounted, computed } from 'vue';

// ===== Fade Transition Props =====
interface FadeProps {
  /** Whether the content should be visible */
  show?: boolean;
  /** Transition duration in milliseconds */
  duration?: number;
}

// ===== Slide Transition Props =====
interface SlideProps {
  /** Direction to slide from */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Whether the content should be visible */
  show?: boolean;
  /** Transition duration in milliseconds */
  duration?: number;
}

// ===== CountUp Animation Props =====
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

// Export individual transition components for granular use
</script>

<script lang="ts">
/**
 * FadeTransition - Smooth opacity-based transition
 * 
 * Provides a simple fade in/out effect for content visibility changes.
 * Ideal for modals, overlays, and subtle content swaps.
 */
export const FadeTransition = defineComponent({
  props: {
    show: { type: Boolean, default: true },
    duration: { type: Number, default: 300 }
  },
  setup(props, { slots }) {
    return () => h(Transition, {
      name: 'fade',
      duration: props.duration
    }, () => props.show ? slots.default?.() : null);
  }
});

import { defineComponent, h, Transition } from 'vue';

/**
 * SlideTransition - Directional slide animation
 * 
 * Slides content in from a specified direction with opacity fade.
 * Perfect for side panels, tab content, and page transitions.
 */
export const SlideTransition = defineComponent({
  props: {
    show: { type: Boolean, default: true },
    direction: { type: String as PropType<'left' | 'right' | 'up' | 'down'>, default: 'right' },
    duration: { type: Number, default: 300 }
  },
  setup(props, { slots }) {
    const axis = computed(() => props.direction === 'left' || props.direction === 'right' ? 'X' : 'Y');
    const sign = computed(() => props.direction === 'right' || props.direction === 'down' ? '' : '-');
    
    return () => h(Transition, {
      name: `slide-${props.direction}`,
      duration: props.duration
    }, () => props.show ? slots.default?.() : null);
  }
});
</script>

<template>
  <div class="transitions-library">
    <!-- This is a meta-component that documents available transitions -->
    <slot />
  </div>
</template>

<style>
/* ===== Fade Transition Styles ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 300ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Slide Transition Styles ===== */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active,
.slide-up-enter-active,
.slide-up-leave-active,
.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 300ms ease, opacity 300ms ease;
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

/* ===== Scale Transition (bonus) ===== */
.scale-enter-active,
.scale-leave-active {
  transition: transform 300ms ease, opacity 300ms ease;
}

.scale-enter-from,
.scale-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

/* ===== Flip Transition (for cards) ===== */
.flip-enter-active,
.flip-leave-active {
  transition: transform 400ms ease, opacity 300ms ease;
  transform-style: preserve-3d;
}

.flip-enter-from {
  transform: rotateY(-90deg);
  opacity: 0;
}

.flip-leave-to {
  transform: rotateY(90deg);
  opacity: 0;
}

/* ===== Bounce Transition (for emphasis) ===== */
.bounce-enter-active {
  animation: bounce-in 500ms;
}

.bounce-leave-active {
  animation: bounce-in 500ms reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
