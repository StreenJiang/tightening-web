<script setup lang="ts">
import { useRoute } from 'vue-router'
import Message from 'primevue/message'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
const titleKey = route.meta.titleKey as string
</script>

<template>
  <div class="page-wrapper">
    <Message severity="info" :closable="false">
      {{ t(titleKey) }} — {{ t('common.underConstruction') }}
    </Message>
  </div>
</template>

<style scoped>
.page-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
