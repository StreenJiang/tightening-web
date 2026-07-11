import { ref, onMounted, onUnmounted } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'
const DARK_CLASS = 'dark'

function loadMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

function saveMode(mode: ThemeMode) {
  try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* ignore */ }
}

function applyTheme(mode: ThemeMode, prefersDark: boolean) {
  const dark = mode === 'system' ? prefersDark : mode === 'dark'
  document.documentElement.classList.toggle(DARK_CLASS, dark)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(loadMode())
  const mql = window.matchMedia('(prefers-color-scheme: dark)')

  function setMode(m: ThemeMode) { mode.value = m; saveMode(m); applyTheme(m, mql.matches) }

  function onChange() { if (mode.value === 'system') applyTheme('system', mql.matches) }

  onMounted(() => { applyTheme(mode.value, mql.matches); mql.addEventListener('change', onChange) })
  onUnmounted(() => { mql.removeEventListener('change', onChange) })

  return { mode, setMode }
})
