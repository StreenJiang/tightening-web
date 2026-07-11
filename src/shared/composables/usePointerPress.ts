import { ref } from 'vue'

export function usePointerPress() {
  const pressed = ref(false)
  return { pressed, onDown: () => { pressed.value = true }, onUp: () => { pressed.value = false } }
}
