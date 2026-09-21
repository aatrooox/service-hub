import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import App from './App.vue'
import './assets/main.css'
import '@xterm/xterm/css/xterm.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
