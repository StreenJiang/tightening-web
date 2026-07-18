<script setup lang="ts">
import TopBar from './TopBar.vue'
import Sidebar from './Sidebar.vue'
import FooterBar from './FooterBar.vue'
</script>

<template>
  <div class="main-layout">
    <TopBar />
    <div class="main-layout-body">
      <Sidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
    <FooterBar />
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-bg);
  padding: 24px;
  min-height: 0;
}
</style>
