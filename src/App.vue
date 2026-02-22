<script setup lang="ts">
import { useRoute } from 'vue-router'
import { GITHUB_STAR_URL } from '@/lib/github-links'

const route = useRoute()

const navItems = [
  { path: '/', label: 'Home', icon: '🏟️' },
  { path: '/arena', label: 'Arena', icon: '⚔️' },
  { path: '/quick', label: 'Quick', icon: '⚡' },
  { path: '/gauntlet', label: 'Gauntlet', icon: '🥊' },
  { path: '/stress', label: 'Stress', icon: '🔥' },
  { path: '/history', label: 'History', icon: '📜' },
  { path: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  ...(import.meta.env.DEV
    ? [{ path: '/diagnostics', label: 'Diagnostics', icon: '🧪' }]
    : []),
]

const isActive = (path: string) => route.path === path
</script>

<template>
  <div class="min-h-screen bg-black text-green-400 font-mono">
    <!-- Navigation -->
    <nav class="border-b border-green-800">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏟️</span>
            <span class="font-bold">Browser Battle Bench</span>
          </div>
          <a
            :href="GITHUB_STAR_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-outline border-green-500 text-green-200 hover:bg-green-700 hover:text-black whitespace-nowrap"
            aria-label="Star Browser Battle Bench on GitHub"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-4 w-4 fill-current"
            >
              <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.4 7.85 10.92.57.1.78-.25.78-.56v-2.15c-3.2.69-3.88-1.54-3.88-1.54-.52-1.34-1.27-1.69-1.27-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.95.1-.75.4-1.25.73-1.53-2.55-.3-5.24-1.28-5.24-5.7 0-1.26.45-2.3 1.19-3.1-.12-.3-.51-1.5.11-3.14 0 0 .97-.31 3.17 1.18a10.92 10.92 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.64.24 2.84.12 3.14.74.8 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.7.41.36.77 1.06.77 2.14v3.17c0 .31.2.67.79.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
            </svg>
            <span class="sm:hidden">⭐ Star</span>
            <span class="hidden sm:inline">⭐ Star us</span>
          </a>
        </div>

        <div class="mt-3 flex flex-wrap gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-3 py-2 rounded transition-colors text-sm"
            :class="isActive(item.path)
              ? 'bg-green-800 text-black'
              : 'hover:bg-green-900 hover:text-green-300'"
          >
            <span class="mr-1">{{ item.icon }}</span>
            <span class="hidden sm:inline">{{ item.label }}</span>
          </router-link>
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
