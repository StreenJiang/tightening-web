<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import { useServerConnectionStore } from '@/stores/serverConnection'
import type { ThemeMode } from '@/stores/theme'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'

const { t, locale } = useI18n()
const sidebar = useSidebarStore()
const theme = useThemeStore()
const conn = useServerConnectionStore()

const configModalVisible = ref(false)
const statusModalVisible = ref(false)
const themeOp = ref<InstanceType<typeof Popover> | null>(null)

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
}

const localeLabel = computed(() => locale.value === 'zh-CN' ? 'EN' : '中')

function selectTheme(m: ThemeMode) {
  theme.setMode(m)
  themeOp.value?.hide()
}

const themeOptions: { mode: ThemeMode; key: string; icon: string }[] = [
  { mode: 'light', key: 'common.themeLight', icon: 'pi pi-sun' },
  { mode: 'dark', key: 'common.themeDark', icon: 'pi pi-moon' },
  { mode: 'system', key: 'common.themeSystem', icon: 'pi pi-palette' },
]

const connLabel = computed(() => {
  const map: Record<string, string> = {
    connected: 'server.connected',
    disconnected: 'server.disconnected',
    unconfigured: 'server.unconfigured',
    loading: 'server.connecting',
  }
  return t(map[conn.status] ?? 'server.unconfigured')
})

function onConnClick() {
  if (conn.status === 'unconfigured') {
    configModalVisible.value = true
  } else if (conn.status === 'disconnected') {
    statusModalVisible.value = true
  }
}

// ---- ServerConfig ----
const cfg = reactive({
  address: '',
  testing: false,
  testResult: 'idle' as 'idle' | 'success' | 'fail',
  testError: '',
  saving: false,
  saveError: '',
})

function resetConfig() {
  Object.assign(cfg, { address: '', testing: false, testResult: 'idle' as const, testError: '', saving: false, saveError: '' })
}

const canSave = computed(() => cfg.testResult === 'success' && !cfg.saving)

async function handleTest() {
  if (!cfg.address.trim()) return
  cfg.testing = true
  cfg.testResult = 'idle'
  cfg.testError = ''
  try {
    const r = await conn.testConnection(cfg.address.trim())
    if (r.success) cfg.testResult = 'success'
    else { cfg.testResult = 'fail'; cfg.testError = r.errorReason }
  } catch {
    cfg.testResult = 'fail'
  } finally {
    cfg.testing = false
  }
}

async function handleSave() {
  if (!canSave) return
  cfg.saving = true
  try {
    await conn.saveConfig(cfg.address.trim())
    configModalVisible.value = false
  } catch {
    cfg.saveError = t('server.saveFailed')
  } finally {
    cfg.saving = false
  }
}

onMounted(() => conn.fetchStatus())
</script>

<template>
  <Toolbar class="topbar">
    <template #start>
      <Button
        icon="pi pi-bars"
        severity="secondary" text rounded
        @click="sidebar.toggle()"
      />
      <span class="topbar-title">{{ t('app.title') }}</span>
      <Button severity="secondary" text class="conn-btn" @click="onConnClick">
        <template #icon>
          <span class="conn-dot" :class="'conn-dot--' + conn.status" />
        </template>
        <span class="conn-label">{{ connLabel }}</span>
      </Button>
    </template>

    <template #end>
      <Button
        :icon="themeOptions.find(o => o.mode === theme.mode)?.icon ?? 'pi pi-palette'"
        severity="secondary" text rounded
        @click="(e: Event) => themeOp?.toggle(e)"
      />
      <Popover ref="themeOp">
        <div class="theme-popover">
          <Button
            v-for="opt in themeOptions" :key="opt.mode"
            :icon="opt.icon" :label="t(opt.key)"
            :severity="theme.mode === opt.mode ? 'primary' : 'secondary'" text
            @click="selectTheme(opt.mode)"
          />
        </div>
      </Popover>

      <Button
        :label="localeLabel" severity="secondary" text rounded
        @click="toggleLocale"
      />
      <Button icon="pi pi-user" severity="secondary" text rounded />
    </template>
  </Toolbar>

  <!-- Connection status dialog -->
  <Dialog
    v-model:visible="statusModalVisible"
    :header="t('server.disconnectTitle')" modal
  >
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:8px">
        <i class="pi pi-exclamation-circle" style="color:var(--p-yellow-500);font-size:18px" />
        <span>{{ t('server.disconnected') }}</span>
      </div>
      <div
        v-if="conn.errorReason"
        style="font-size:13px;color:var(--color-text-secondary)"
      >
        {{ t('server.reason') }}: {{ conn.errorReason }}
      </div>
    </div>
    <template #footer>
      <Button
        icon="pi pi-refresh" :label="t('server.manualReconnect')"
        @click="conn.reconnect()"
      />
    </template>
  </Dialog>

  <!-- Server config dialog -->
  <Dialog
    v-model:visible="configModalVisible"
    :header="t('server.configureTitle')" modal @show="resetConfig"
  >
    <div style="display:flex;flex-direction:column;gap:12px">
      <label style="font-size:13px">{{ t('server.address') }}</label>
      <InputText
        v-model="cfg.address"
        :placeholder="t('server.addressPlaceholder')"
        :disabled="cfg.testing" fluid
      />
      <Message v-if="cfg.testResult === 'success'" severity="success">
        {{ t('server.testSuccess') }}
      </Message>
      <Message v-else-if="cfg.testResult === 'fail'" severity="error">
        {{ cfg.testError || t('server.testFailed') }}
      </Message>
      <Message v-if="cfg.saveError" severity="error">
        {{ cfg.saveError }}
      </Message>
    </div>
    <template #footer>
      <Button
        :label="t('server.testConnection')"
        :loading="cfg.testing" :disabled="!cfg.address.trim()"
        severity="secondary" @click="handleTest"
      />
      <Button
        :label="t('server.save')" :disabled="!canSave"
        @click="handleSave"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  flex-shrink: 0;
  padding: 0 12px;
  background: var(--color-topbar-bg);
  border: none;
  border-bottom: 1px solid var(--color-border);
}
.topbar-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 8px;
}
.conn-btn {
  flex-shrink: 0;
}
.conn-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--p-gray-400);
}
.conn-dot--connected { background: var(--p-green-500); }
.conn-dot--disconnected { background: var(--p-red-500); }
.conn-dot--unconfigured { background: var(--p-yellow-500); }
.conn-dot--loading { background: var(--p-blue-500); }

.conn-label {
  font-size: 13px;
  margin-left: 4px;
  white-space: nowrap;
}
.theme-popover {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 150px;
}
</style>
