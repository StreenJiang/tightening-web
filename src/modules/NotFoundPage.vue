<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()
const pressed = ref(false)
</script>

<template>
  <div class="not-found-page">
    <h1 class="not-found-title">404</h1>
    <p class="not-found-text">{{ t('common.notFound') }}</p>
    <RouterLink
      to="/"
      class="not-found-link"
      :class="{ pressed }"
      @pointerdown="pressed = true"
      @pointerup="pressed = false"
      @pointerleave="pressed = false"
    >
      {{ t('common.backHome') }}
    </RouterLink>
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

.not-found-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-sidebar-active-text);
  font-size: 14px;
  text-decoration: none;
  transition: background 0.1s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

@media (hover: hover) {
  .not-found-link:hover {
    background: var(--color-primary-hover);
  }
}

.not-found-link.pressed {
  background: var(--color-primary-hover);
  transform: scale(0.97);
}
</style>
