<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

const { t } = useI18n()
</script>

<template>
  <div class="not-found-page">
    <h1 class="not-found-title">404</h1>
    <p class="not-found-text">{{ t('common.notFound') }}</p>
    <Button
      as="router-link" to="/"
      :label="String(t('common.backHome'))"
    />
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.not-found-title {
  font-size: 72px;
  font-weight: 600;
  color: var(--color-text-secondary);
  opacity: 0.4;
}

.not-found-text {
  font-size: 16px;
  color: var(--color-text-secondary);
}
</style>
