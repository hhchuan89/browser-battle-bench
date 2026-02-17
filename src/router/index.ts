import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/Home.vue') },
  { path: '/arena', name: 'arena', component: () => import('../views/Arena.vue') },
  { path: '/gauntlet', name: 'gauntlet', component: () => import('../views/Gauntlet.vue') },
  { path: '/stress', name: 'stress', component: () => import('../views/StressTest.vue') },
  { path: '/history', name: 'history', component: () => import('../views/History.vue') },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('../views/Leaderboard.vue') },
  { path: '/diagnostics', name: 'diagnostics', component: () => import('../views/Diagnostics.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
