import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface ConfirmOptions {
  title: string
  message: string
  cancelLabel?: string
  confirmLabel?: string
}

export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false)
  const opts = ref<ConfirmOptions>({ title: '', message: '' })
  let resolveFn: ((val: boolean) => void) | null = null

  function open(o: ConfirmOptions): Promise<boolean> {
    opts.value = o
    visible.value = true
    return new Promise(resolve => { resolveFn = resolve })
  }

  function confirm() {
    visible.value = false
    resolveFn?.(true)
    resolveFn = null
  }

  function cancel() {
    visible.value = false
    resolveFn?.(false)
    resolveFn = null
  }

  return { visible, opts, open, confirm, cancel }
})
