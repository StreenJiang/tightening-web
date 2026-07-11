import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'sidebar-collapsed'

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export const useSidebarStore = defineStore('sidebar', () => {
  const collapsed = ref(loadCollapsed())

  function toggle() {
    collapsed.value = !collapsed.value
  }

  watch(collapsed, saveCollapsed)

  return { collapsed, toggle }
})
