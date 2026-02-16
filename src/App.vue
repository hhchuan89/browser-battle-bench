<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/arena', label: 'Arena', icon: '⚔️' },
  { path: '/gauntlet', label: 'Gauntlet', icon: '🥊' },
  { path: '/stress', label: 'Stress', icon: '🔥' },
  { path: '/history', label: 'History', icon: '📜' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
]

const isActive = (path: string) => route.path === path
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono">
    <!-- Navigation -->
    <nav class="border-b border-green-800">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏟️</span>
            <span class="font-bold">Browser Battle Bench</span>
          </div>
          
          <div class="flex gap-1">
            <a 
              v-for="item in navItems" 
              :key="item.path"
              :href="item.path"
              class="px-3 py-2 rounded transition-colors text-sm"
              :class="isActive(item.path) 
                ? 'bg-green-800 text-black' 
                : 'hover:bg-green-900 hover:text-green-300'"
            >
              <span class="mr-1">{{ item.icon }}</span>
              <span class="hidden sm:inline">{{ item.label }}</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Main Content -->
    <main>
      <router-view />
    </main>
    
    <!-- Footer -->
    <footer class="mt-8 py-4 text-center text-xs text-green-900 border-t border-green-900">
      <p>NO REPAIR. NO YAPPING. PURE CARNAGE.</p>
    </footer>
  </div>
</template>
