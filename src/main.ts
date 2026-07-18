import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { tighteningPreset } from './theme/preset'
import i18n from './i18n'
import router from './router'
import App from './App.vue'
import 'primeicons/primeicons.css'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: tighteningPreset,
    options: { darkModeSelector: 'html.dark' },
  },
  ripple: false,
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)
app.mount('#app')
