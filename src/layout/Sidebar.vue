<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import Button from 'primevue/button'

const router = useRouter()
const route = useRoute()
const sidebar = useSidebarStore()
const { t } = useI18n()

interface MenuItem {
  path: string
  meta: { titleKey: string; icon?: string }
}

const menuItems = computed<MenuItem[]>(() => {
  const root = router.options.routes.find((r) => r.path === '/')
  if (!root?.children) return []
  return root.children
    .filter((r) => r.meta?.titleKey)
    .map((r) => ({
      path: '/' + r.path,
      meta: {
        titleKey: r.meta?.titleKey as string,
        icon: r.meta?.icon as string | undefined,
      },
    }))
})

function isActive(item: MenuItem): boolean {
  return route.path === item.path || route.path.startsWith(item.path + '/')
}

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: sidebar.collapsed }">
    <nav class="sidebar-nav">
      <Button
        v-for="item in menuItems"
        :key="item.path"
        :severity="isActive(item) ? 'primary' : 'secondary'"
        :text="!isActive(item)"
        class="sidebar-btn"
        v-tooltip.right="sidebar.collapsed ? t(item.meta.titleKey) : undefined"
        @click="navigate(item.path)"
      >
        <i :class="item.meta.icon" class="sidebar-btn-icon" />
        <span
          v-if="!sidebar.collapsed"
          class="sidebar-btn-label"
        >{{ t(item.meta.titleKey) }}</span>
      </Button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-expanded);
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;
  contain: layout style;
  background: var(--color-sidebar-bg);
  border: none;
  border-right: 1px solid var(--color-border);
}
.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  gap: 2px;
}

.sidebar-btn {
  width: 100%;
  justify-content: flex-start;
  min-height: 44px;
  padding-left: 18px;
  padding-right: 12px;
  white-space: nowrap;
  box-shadow: none;
}

.sidebar-btn-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.sidebar-btn-label {
  margin-left: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar.collapsed .sidebar-btn {
  padding-left: 18px;
  padding-right: 0;
}
</style>
