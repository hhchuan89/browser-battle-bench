import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { inject } from '@vercel/analytics'
import { router } from './router'
import './style.css'
import App from './App.vue'
import { migrateLegacyStorage } from '@/lib/persistence-v2'

inject()

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')

void migrateLegacyStorage()
