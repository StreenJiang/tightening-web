<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSidebarStore } from '@/stores/sidebar'
import { useThemeStore } from '@/stores/theme'
import { useServerConnectionStore } from '@/stores/serverConnection'
import type { ThemeMode } from '@/stores/theme'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import LogViewer from './LogViewer.vue'

const { t, locale } = useI18n()
const sidebar = useSidebarStore()
const theme = useThemeStore()
const conn = useServerConnectionStore()

const configModalVisible = ref(false)
const statusModalVisible = ref(false)
const logVisible = ref(false)

function toggleLocale() {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
}

const localeLabel = computed(() => locale.value === 'zh-CN' ? 'EN' : '中')

function toggleTheme() {
  const next: ThemeMode = theme.mode === 'dark' ? 'light' : 'dark'
  theme.setMode(next)
}

const themeIcon = computed(() => theme.mode === 'dark' ? 'pi pi-sun' : 'pi pi-moon')

const CONN_LABEL_KEYS: Record<string, string> = {
  connected: 'server.connected',
  disconnected: 'server.disconnected',
  unconfigured: 'server.unconfigured',
  loading: 'server.connecting',
}

const connLabel = computed(() => t(CONN_LABEL_KEYS[conn.status] ?? 'server.unconfigured'))

const connDialogTitle = computed(() => conn.status === 'connected' ? t('server.connected') : t('server.disconnectTitle'))

function onConnClick() {
  if (conn.status === 'unconfigured') {
    configModalVisible.value = true
  } else {
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
      <Button
        severity="secondary" text class="conn-btn"
        @click="onConnClick"
      >
        <span class="conn-dot" :class="'conn-dot--' + conn.status" />
        <span class="conn-label">{{ connLabel }}</span>
      </Button>
    </template>

    <template #end>
      <Button
        icon="pi pi-history"
        severity="secondary" text rounded
        @click="logVisible = true"
      />
      <Button
        :icon="themeIcon"
        severity="secondary" text rounded
        @click="toggleTheme"
      />

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
    :header="connDialogTitle" modal
    :pt="{ root: { style: { width: '380px' } } }"
  >
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:center;gap:8px">
        <i
          :class="conn.status === 'connected' ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"
          :style="{ color: conn.status === 'connected' ? 'var(--p-green-500)' : 'var(--p-yellow-500)', fontSize: '18px' }"
        />
        <span>{{ connLabel }}</span>
      </div>
      <div
        v-if="conn.status === 'connected' && conn.address"
        class="status-detail"
      >
        {{ conn.address }}
      </div>
      <div
        v-if="conn.status === 'connected' && conn.latency !== undefined"
        style="font-size:13px;color:var(--color-text-secondary)"
      >
        {{ t('server.latencyValue', { n: conn.latency }) }}
      </div>
      <div
        v-if="conn.status === 'disconnected' && conn.errorReason"
        style="font-size:13px;color:var(--color-text-secondary)"
      >
        {{ t('server.reason') }}: {{ conn.errorReason }}
      </div>
    </div>
    <template #footer>
      <Button
        v-if="conn.status === 'disconnected'"
        icon="pi pi-refresh" :label="t('server.manualReconnect')"
        @click="conn.reconnect()"
      />
      <Button
        v-else
        :label="t('common.close')" severity="secondary" text
        @click="statusModalVisible = false"
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

  <LogViewer v-model:visible="logVisible" />
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conn-btn {
  flex-shrink: 0;
  min-width: fit-content;
  gap: 4px;
}
.conn-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--p-gray-400);
  display: inline-block;
  flex-shrink: 0;
}
.conn-dot--connected { background: var(--p-green-500); }
.conn-dot--disconnected { background: var(--p-red-500); }
.conn-dot--unconfigured { background: var(--p-yellow-500); }
.conn-dot--loading { background: var(--p-blue-500); }

.conn-label {
  font-size: 13px;
  white-space: nowrap;
}

.status-detail {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
