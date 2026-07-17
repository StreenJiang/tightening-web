<script setup lang="ts">
import ToastNotification from '@/shared/components/ToastNotification.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
</script>

<template>
  <router-view />
  <ToastNotification />
  <ConfirmDialog />
</template>
