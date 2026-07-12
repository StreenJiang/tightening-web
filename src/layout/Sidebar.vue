<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'

const router = useRouter()
const route = useRoute()
const sidebar = useSidebarStore()
const { t } = useI18n()

const hoveredItem = ref<string | null>(null)
const flyoutStyle = ref<Record<string, string>>({})
const pressedPath = ref<string | null>(null)
const fading = ref(false)
const clickLocked = ref(false)
let flyoutTimer: ReturnType<typeof setTimeout> | null = null

interface MenuItem {
  path: string
  meta: {
    titleKey: string
    icon?: string
  }
}

const menuItems = computed<MenuItem[]>(() => {
  const root = router.options.routes.find((r) => r.path === '/')
  if (!root?.children) return []
  return root.children
    .filter((r) => r.meta?.titleKey)
    .map((r) => ({
      path: `/${r.path}`.replace(/^\/\//, '/'),
      meta: {
        titleKey: r.meta?.titleKey as string,
        icon: r.meta?.icon as string | undefined,
      },
    }))
})

function isActive(item: MenuItem): boolean {
  return route.path === item.path
}

function cancelFadeTimer() {
  if (flyoutTimer) { clearTimeout(flyoutTimer); flyoutTimer = null }
  clickLocked.value = false
  fading.value = false
}

function startFadeTimer() {
  cancelFadeTimer()
  clickLocked.value = true
  flyoutTimer = setTimeout(() => {
    fading.value = true
    flyoutTimer = setTimeout(() => {
      hoveredItem.value = null
      fading.value = false
      clickLocked.value = false
      flyoutTimer = null
    }, 800)
  }, 1200)
}

function onMouseEnter(event: MouseEvent, itemPath: string) {
  if (!sidebar.collapsed) return
  cancelFadeTimer()
  hoveredItem.value = itemPath
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  flyoutStyle.value = {
    left: `${rect.right + 4}px`,
    top: `${rect.top}px`,
  }
}

function onMouseLeave() {
  if (clickLocked.value) return
  hoveredItem.value = null
}

function onClickItem() {
  if (!sidebar.collapsed) return
  startFadeTimer()
}

onUnmounted(() => {
  if (flyoutTimer) clearTimeout(flyoutTimer)
  flyoutTimer = null
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: sidebar.collapsed }">
    <nav class="sidebar-nav">
      <ul class="sidebar-menu">
        <li
          v-for="item in menuItems"
          :key="item.path"
          class="sidebar-menu-item"
          :class="{ active: isActive(item) }"
          @mouseenter="(e: MouseEvent) => onMouseEnter(e, item.path)"
          @mouseleave="onMouseLeave"
        >
          <RouterLink
            :to="item.path"
            class="sidebar-link"
            :class="{ pressed: pressedPath === item.path }"
            @click="onClickItem"
            @pointerdown="pressedPath = item.path"
            @pointerup="pressedPath = null"
            @pointerleave="pressedPath = null"
          >
            <Icon
              v-if="item.meta.icon"
              :icon="item.meta.icon"
              class="sidebar-link-icon"
            />
            <span v-if="!sidebar.collapsed" class="sidebar-link-text">
              {{ t(item.meta.titleKey) }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <Teleport to="body">
      <div
        v-if="sidebar.collapsed && hoveredItem"
        class="sidebar-flyout"
        :class="{ fading }"
        :style="flyoutStyle"
        @mouseleave="onMouseLeave"
      >
        <template v-for="item in menuItems" :key="item.path">
          <div
            v-if="item.path === hoveredItem"
            class="sidebar-flyout-title"
          >
            {{ t(item.meta.titleKey) }}
          </div>
        </template>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-expanded);
  background: var(--color-sidebar-bg);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s ease;
  overflow: hidden;
  border-right: 1px solid var(--color-sidebar-border);
  contain: layout style;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu {
  padding: 8px;
}

.sidebar-menu-item {
  margin-bottom: 2px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 6px;
  color: var(--color-sidebar-text);
  transition: background 0.1s, transform 0.1s;
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

@media (hover: hover) {
  .sidebar-link:hover {
    background: var(--color-sidebar-hover);
  }
}
.sidebar-link.pressed {
  background: var(--color-sidebar-hover);
  transform: scale(0.97);
}

.sidebar-menu-item.active > .sidebar-link {
  background: var(--color-sidebar-active);
  color: var(--color-sidebar-active-text);
}

.sidebar-link-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.sidebar-link-text {
  margin-left: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 折叠态悬停浮层 */
.sidebar-flyout {
  position: fixed;
  background: var(--color-sidebar-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.8s ease;
}

.sidebar-flyout.fading {
  opacity: 0;
}

.sidebar-flyout-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-sidebar-text);
}
</style>
