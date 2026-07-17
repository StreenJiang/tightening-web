<script setup lang="ts">
defineProps<{
  maxHeight?: string
}>()
</script>

<template>
  <div class="scroll-area" :style="maxHeight ? { maxHeight } : {}">
    <slot />
  </div>
</template>

<style scoped>
.scroll-area {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.scroll-area::-webkit-scrollbar {
  width: 6px;
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.scroll-area::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
</style>
