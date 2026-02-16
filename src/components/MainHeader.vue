<script setup lang="ts">
/**
 * MainHeader component
 * Displays the project title and version.
 */
</script>

<template>
  <header class="border-b border-green-700 pb-4 mb-8">
    <h1 class="text-4xl font-bold glitch" data-text="BROWSER BATTLE BENCH">BROWSER BATTLE BENCH</h1>
    <div class="text-sm text-green-700 mt-2">v0.0.1 [INITIATED]</div>
  </header>
</template>

<style scoped>
/* Simple CSS glitch effect */
.glitch {
  position: relative;
  color: #22c55e; /* green-500 */
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
}

.glitch::before {
  left: 2px;
  text-shadow: -1px 0 #ff00c1;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitch-anim 5s infinite linear alternate-reverse;
}

.glitch::after {
  left: -2px;
  text-shadow: -1px 0 #00fff9;
  clip: rect(44px, 450px, 56px, 0);
  animation: glitch-anim2 5s infinite linear alternate-reverse;
}

@keyframes glitch-anim {
  0% { clip: rect(35px, 9999px, 81px, 0); }
  20% { clip: rect(6px, 9999px, 86px, 0); }
  40% { clip: rect(59px, 9999px, 14px, 0); }
  60% { clip: rect(10px, 9999px, 42px, 0); }
  80% { clip: rect(27px, 9999px, 73px, 0); }
  100% { clip: rect(89px, 9999px, 5px, 0); }
}

@keyframes glitch-anim2 {
  0% { clip: rect(15px, 9999px, 61px, 0); }
  20% { clip: rect(86px, 9999px, 26px, 0); }
  40% { clip: rect(39px, 9999px, 94px, 0); }
  60% { clip: rect(50px, 9999px, 22px, 0); }
  80% { clip: rect(17px, 9999px, 53px, 0); }
  100% { clip: rect(9px, 9999px, 25px, 0); }
}
</style>
