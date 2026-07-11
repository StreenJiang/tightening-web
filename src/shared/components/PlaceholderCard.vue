<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  titleKey: string
  icon?: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="placeholder-card">
    <Icon v-if="icon" :icon="icon" class="placeholder-icon" />
    <h2 class="placeholder-title">{{ t(titleKey) }}</h2>
    <p class="placeholder-subtitle">{{ t('common.underConstruction') }}</p>
  </div>
</template>

<style scoped>
.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.placeholder-title {
  font-size: 20px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 8px;
}

.placeholder-subtitle {
  font-size: 14px;
}
</style>
