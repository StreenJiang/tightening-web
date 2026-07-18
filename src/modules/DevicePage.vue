<script setup lang="ts">
import Message from 'primevue/message'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <div class="page-wrapper">
    <Message severity="info" :closable="false">
      {{ t('menu.device') }} — {{ t('common.underConstruction') }}
    </Message>
  </div>
</template>

<style scoped>
.page-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
