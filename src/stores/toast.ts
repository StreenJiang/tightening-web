import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', () => {
  const visible = ref(false)
  const message = ref('')
  const type = ref<'success' | 'error'>('success')
  let timer: ReturnType<typeof setTimeout>

  function show(msg: string, t: 'success' | 'error' = 'success', ms = 2000) {
    clearTimeout(timer)
    message.value = msg
    type.value = t
    visible.value = true
    if (ms > 0) timer = setTimeout(() => { visible.value = false }, ms)
  }

  function hide() {
    visible.value = false
    clearTimeout(timer)
  }

  return { visible, message, type, show, hide }
})
