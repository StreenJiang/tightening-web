<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="card">
    <h3 v-if="title" class="card-title">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.card {
  padding: 20px 24px;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
}

.card + .card {
  margin-top: 16px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secondary);
  margin: 0 0 16px 0;
}
</style>
