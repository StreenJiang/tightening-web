<script setup lang="ts">
import { useRoute } from 'vue-router'
import PlaceholderCard from '@/shared/components/PlaceholderCard.vue'

const route = useRoute()
const titleKey = route.meta.titleKey as string
const icon = route.meta.icon as string | undefined
</script>

<template>
  <div class="page-wrapper">
    <PlaceholderCard :title-key="titleKey" :icon="icon" />
  </div>
</template>

<style scoped>
.page-wrapper { height: 100%; display: flex; align-items: center; justify-content: center; }
</style>
