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
 * This file provides the CSS styles for transitions.
 * Individual components (FadeTransition, SlideTransition, etc.) 
 * are exported from their own files in this directory.
 */

</script>

<template>
  <div class="transitions-library">
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
