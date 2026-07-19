<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import RadioButton from 'primevue/radiobutton'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import { checkName, fetchMissions } from '@/shared/api/mission'
import type { ProductMission } from '@/shared/types/mission'

const props = defineProps<{
  modelValue: ProductMission
  isEdit: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProductMission]
}>()

const { t } = useI18n()
const confirm = useConfirm()

const nameError = ref('')
const nameChecking = ref(false)
let checkTimer: ReturnType<typeof setTimeout>

const availableMissions = ref<ProductMission[]>([])
const boundMissionIds = ref<number[]>([])

// Mission-picker Dialog (only for 指定任务 scope)
const missionPickerVisible = ref(false)
const tempBoundMissionIds = ref<number[]>([])

async function openMissionPicker() {
  tempBoundMissionIds.value = [...boundMissionIds.value]
  if (availableMissions.value.length === 0) {
    try {
      const data = await fetchMissions({ page: 1, size: 500 })
      availableMissions.value = data.records.filter(
        (m) => !m.isInspection && m.id !== props.modelValue.id,
      )
    } catch {
      /* ignore */
    }
  }
  missionPickerVisible.value = true
}

function onMissionPickerOk() {
  // 仅更新本地数组，不再调 API
  boundMissionIds.value = [...tempBoundMissionIds.value]
  missionPickerVisible.value = false
}

function onMissionPickerCancel() {
  if (isMissionPickerDirty()) {
    confirm.require({
      header: t('mission.edit.inspectionDiscardTitle'),
      message: t('mission.edit.inspectionDiscardMessage'),
      rejectLabel: t('mission.edit.inspectionDiscardStay'),
      acceptLabel: t('mission.edit.inspectionDiscardLeave'),
      accept: () => {
        missionPickerVisible.value = false
      },
    })
  } else {
    missionPickerVisible.value = false
  }
}

function isMissionPickerDirty(): boolean {
  const a = tempBoundMissionIds.value
  const b = boundMissionIds.value
  return a.length !== b.length || a.some((v) => !b.includes(v))
}

function update<K extends keyof ProductMission>(key: K, value: ProductMission[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

async function validateName() {
  clearTimeout(checkTimer)
  const name = props.modelValue.name.trim()
  if (!name) {
    nameError.value = t('mission.edit.nameRequired')
    return
  }
  if (name.length > 50) {
    nameError.value = '名称不能超过50个字符'
    return
  }
  nameChecking.value = true
  checkTimer = setTimeout(async () => {
    try {
      const excludeId = props.isEdit ? props.modelValue.id : undefined
      const isDup = await checkName(name, excludeId)
      nameError.value = isDup ? t('mission.edit.nameDuplicate') : ''
    } catch {
      // 校验失败不阻塞保存
    } finally {
      nameChecking.value = false
    }
  }, 400)
}

function onNameBlur() {
  validateName()
}

onUnmounted(() => clearTimeout(checkTimer))

defineExpose({ getBoundMissionIds: () => boundMissionIds.value })

function loadBoundMissions() {
  // GET /{id} 已返回 inspectionBoundMissionIds，直接使用
  if (props.modelValue.inspectionBoundMissionIds) {
    boundMissionIds.value = [...props.modelValue.inspectionBoundMissionIds]
  }
}

// Reset when inspection turned off
watch(() => props.modelValue.isInspection, (val) => {
  if (!val) {
    update('inspectionScope', 0)
    boundMissionIds.value = []
  }
  })

// 数据加载后自动填充
watch(() => props.modelValue.inspectionBoundMissionIds, (ids) => {
  if (ids && ids.length > 0) {
    loadBoundMissions()
  }
}, { immediate: true })
</script>

<template>
  <div>
    <!-- 基本属性 -->
    <Card class="form-card">
      <template #title>
        <div class="card-header">
          <span>{{ t('mission.edit.groups.basic') }}</span>
        </div>
      </template>
      <template #content>
        <div class="form-row form-row-name">
          <label class="form-label">{{ t('mission.edit.fields.name') }}</label>
          <div class="form-field">
            <InputText
              :model-value="modelValue.name"
              :placeholder="String(t('mission.edit.fields.name'))"
              :class="{ 'p-invalid': nameError }"
              fluid
              @update:model-value="update('name', ($event as string) ?? '')"
              @blur="onNameBlur"
            />
            <span v-if="nameChecking" class="field-spinner" />
            <p v-if="nameError" class="field-error">{{ nameError }}</p>
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.enabled') }}</label>
          <ToggleSwitch
            :model-value="modelValue.enabled"
            @update:model-value="update('enabled', $event as boolean)"
          />
        </div>
      </template>
    </Card>

    <!-- 执行控制 -->
    <Card class="form-card">
      <template #title>
        <div class="card-header">
          <span>{{ t('mission.edit.groups.execution') }}</span>
        </div>
      </template>
      <template #content>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.maxNgCount') }}</label>
          <InputNumber
            :model-value="modelValue.maxNgCount ?? undefined"
            :min="0"
            :max="999"
            @update:model-value="update('maxNgCount', $event ?? null)"
          />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.passwordAfterNg') }}</label>
          <InputNumber
            :model-value="modelValue.passwordRequiredNgCount ?? undefined"
            :min="0"
            :max="999"
            @update:model-value="update('passwordRequiredNgCount', $event ?? null)"
          />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.skipScrew') }}</label>
          <ToggleSwitch
            :model-value="modelValue.skipScrew"
            @update:model-value="update('skipScrew', $event as boolean)"
          />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.multiDevice') }}</label>
          <ToggleSwitch
            :model-value="modelValue.multiDeviceIndependent"
            @update:model-value="update('multiDeviceIndependent', $event as boolean)"
          />
        </div>
      </template>
    </Card>

    <!-- 点检配置 -->
    <Card class="form-card">
      <template #title>
        <div class="card-header">
          <span>{{ t('mission.edit.groups.inspection') }}</span>
        </div>
      </template>
      <template #content>
        <div class="form-row">
          <label class="form-label">{{ t('mission.edit.fields.isInspection') }}</label>
          <ToggleSwitch
            :model-value="modelValue.isInspection"
            @update:model-value="update('isInspection', $event as boolean)"
          />
        </div>

        <template v-if="modelValue.isInspection">
          <div class="form-row radio-row">
            <label class="form-label">{{ t('mission.edit.fields.inspectionScope') }}</label>
            <div class="radio-group">
              <label class="radio-item">
                <RadioButton
                  :model-value="modelValue.inspectionScope"
                  name="inspectionScope"
                  :value="1"
                  @update:model-value="update('inspectionScope', 1)"
                />
                <span>{{ t('mission.edit.fields.inspectionScopeAll') }}</span>
              </label>
              <label class="radio-item">
                <RadioButton
                  :model-value="modelValue.inspectionScope"
                  name="inspectionScope"
                  :value="2"
                  @update:model-value="update('inspectionScope', 2)"
                />
                <span>{{ t('mission.edit.fields.inspectionScopeChosen') }}</span>
              </label>
            </div>
          </div>

          <div
            v-if="modelValue.inspectionScope === 2"
            class="form-row"
          >
            <label class="form-label" />
            <Button
              icon="pi pi-list"
              :label="String(t('mission.edit.fields.inspectionSelectMissions'))"
              severity="secondary" outlined size="small"
              @click="openMissionPicker"
            />
          </div>
        </template>
      </template>
    </Card>

    <!-- Mission Picker Dialog (only for 指定任务) -->
    <Dialog
      v-model:visible="missionPickerVisible"
      modal
      :header="t('mission.edit.inspectionDialogTitle')"
      :style="{ width: '480px' }"
    >
      <MultiSelect
        v-model="tempBoundMissionIds"
        :options="availableMissions"
        option-label="name"
        option-value="id"
        :placeholder="String(t('mission.edit.fields.inspectionSelectMissions'))"
        filter
        fluid
        display="chip"
      />

      <template #footer>
        <Button
          :label="String(t('mission.edit.cancel'))"
          severity="secondary"
          @click="onMissionPickerCancel"
        />
        <Button
          :label="String(t('mission.edit.inspectionDialogOk'))"
          @click="onMissionPickerOk"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.form-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.form-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  gap: 16px;
}
.form-row + .form-row {
  margin-top: 8px;
}

.form-row-name {
  min-height: auto;
  align-items: flex-start;
}
.form-row-name .form-label {
  padding-top: 10px;
}

.form-label {
  width: 110px;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  text-align: right;
  color: var(--p-surface-600);
}

.form-field {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.field-error {
  font-size: 13px;
  color: var(--p-red-500);
  margin: 4px 0 0 0;
}

.field-spinner {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid var(--p-surface-300);
  border-top-color: var(--p-primary-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.radio-row {
  min-height: auto;
  align-items: flex-start;
}
.radio-row .form-label {
  padding-top: 10px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  font-size: 14px;
  cursor: pointer;
}


.picker-item:hover {
  background: var(--p-surface-100);
}
</style>
