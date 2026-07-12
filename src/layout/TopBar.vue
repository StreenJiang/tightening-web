<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import IconButton from '@/shared/components/IconButton.vue'
import MenuItem from '@/shared/components/MenuItem.vue'
import type { ThemeMode } from '@/stores/theme'
import ConnectionIndicator from '@/shared/components/ConnectionIndicator.vue'
import ServerConfigModal from '@/shared/components/ServerConfigModal.vue'
import ConnectionStatusModal from '@/shared/components/ConnectionStatusModal.vue'
import { useServerConnectionStore } from '@/stores/serverConnection'

const { t, locale } = useI18n()
const conn = useServerConnectionStore()
const configModalVisible = ref(false)
const statusModalVisible = ref(false)
const sidebar = useSidebarStore()
const theme = useThemeStore()

const themeOpen = ref(false)
const themeBtn = ref<InstanceType<typeof IconButton> | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

function onDocClick(e: MouseEvent) {
  const el = themeBtn.value?.$el as HTMLElement | undefined
  if (el && !el.contains(e.target as Node)) {
    themeOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
onMounted(() => conn.fetchStatus())

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
}

function onConnClick() {
  if (conn.status === 'unconfigured') {
    configModalVisible.value = true
  } else if (conn.status === 'disconnected') {
    statusModalVisible.value = true
  }
  // connected — tooltip 已在 title 属性中处理，无需弹出
}

const localeLabel = computed(() => locale.value === 'zh-CN' ? 'EN' : '中')

async function openThemeDropdown() {
  themeOpen.value = !themeOpen.value
  if (themeOpen.value) {
    await nextTick()
    const el = themeBtn.value?.$el as HTMLElement | undefined
    if (el) {
      const rect = el.getBoundingClientRect()
      dropdownStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
      }
    }
  }
}

function selectTheme(m: ThemeMode) {
  theme.setMode(m)
  themeOpen.value = false
}

const themeIcon = computed(() => {
  const icons: Record<ThemeMode, string> = {
    light: 'mdi:white-balance-sunny',
    dark: 'mdi:weather-night',
    system: 'mdi:theme-light-dark',
  }
  return icons[theme.mode]
})

const themeOptions: { mode: ThemeMode; key: string; icon: string }[] = [
  { mode: 'light', key: 'common.themeLight', icon: 'mdi:white-balance-sunny' },
  { mode: 'dark', key: 'common.themeDark', icon: 'mdi:weather-night' },
  { mode: 'system', key: 'common.themeSystem', icon: 'mdi:theme-light-dark' },
]
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <IconButton
        :icon="sidebar.collapsed ? 'mdi:menu-open' : 'mdi:menu'"
        :title="t(sidebar.collapsed ? 'common.expandSidebar' : 'common.collapseSidebar')"
        @click="sidebar.toggle()"
      />
      <span class="topbar-title">{{ t('app.title') }}</span>
      <ConnectionIndicator
        :status="conn.status"
        :address="conn.address"
        :latency="conn.latency ?? undefined"
        @click="onConnClick"
      />
    </div>
    <div class="topbar-right">
      <!-- 主题 -->
      <IconButton
        ref="themeBtn"
        :icon="themeIcon"
        :title="t('common.themeSwitch')"
        @click="openThemeDropdown"
      />
      <Teleport to="body">
        <div v-if="themeOpen" class="theme-dropdown" :style="dropdownStyle" @click.stop>
          <MenuItem
            v-for="opt in themeOptions"
            :key="opt.mode"
            :icon="opt.icon"
            :label="t(opt.key)"
            :active="theme.mode === opt.mode"
            @click="selectTheme(opt.mode)"
          />
        </div>
      </Teleport>

      <!-- 语言 -->
      <IconButton
        :label="localeLabel"
        :title="t('common.switchLanguage')"
        @click="toggleLocale"
      />

      <!-- 用户 -->
      <IconButton icon="mdi:account-circle" />
    </div>
  </header>
  <ServerConfigModal :visible="configModalVisible" @close="configModalVisible = false" />
  <ConnectionStatusModal :visible="statusModalVisible" @close="statusModalVisible = false" />
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--color-topbar-bg);
  border-bottom: 1px solid var(--color-topbar-border);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.theme-dropdown {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 1100;
  min-width: 150px;
  padding: 4px;
}
</style>
