<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ToggleSwitch from 'primevue/toggleswitch'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import RadioButton from 'primevue/radiobutton'
import Checkbox from 'primevue/checkbox'
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

const nameError = ref('')
const nameChecking = ref(false)
let checkTimer: ReturnType<typeof setTimeout>

const availableMissions = ref<ProductMission[]>([])
const boundMissionIds = ref<number[]>([])

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

watch(
  () => props.modelValue.isInspection,
  (val) => {
    if (!val) {
      update('inspectionScope', 0)
      boundMissionIds.value = []
    }
  },
)

watch(
  () => props.modelValue.inspectionScope,
  async (val) => {
    if (val === 2 && availableMissions.value.length === 0) {
      try {
        const data = await fetchMissions({ page: 1, size: 500 })
        availableMissions.value = data.records.filter(
          (m) => !m.isInspection && m.id !== props.modelValue.id,
        )
      } catch {
        /* ignore */
      }
    }
  },
)

function toggleBindMission(id: number) {
  const idx = boundMissionIds.value.indexOf(id)
  if (idx === -1) {
    boundMissionIds.value.push(id)
  } else {
    boundMissionIds.value.splice(idx, 1)
  }
}
</script>

<template>
  <form class="mission-form" @submit.prevent>
    <!-- 基本属性 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.basic') }}</h3>
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
    </div>

    <!-- 执行控制 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.execution') }}</h3>
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
        <label class="form-label">{{ t('mission.edit.fields.skipScrew') }}</label>
        <ToggleSwitch
          :model-value="modelValue.skipScrew"
          @update:model-value="update('skipScrew', $event as boolean)"
        />
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.passwordAfterNg') }}</label>
        <ToggleSwitch
          :model-value="modelValue.passwordRequiredAfterNg"
          @update:model-value="update('passwordRequiredAfterNg', $event as boolean)"
        />
      </div>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.multiDevice') }}</label>
        <ToggleSwitch
          :model-value="modelValue.multiDeviceIndependent"
          @update:model-value="update('multiDeviceIndependent', $event as boolean)"
        />
      </div>
    </div>

    <!-- 点检配置 -->
    <div class="form-group">
      <h3 class="group-title">{{ t('mission.edit.groups.inspection') }}</h3>
      <div class="form-row">
        <label class="form-label">{{ t('mission.edit.fields.isInspection') }}</label>
        <ToggleSwitch
          :model-value="modelValue.isInspection"
          @update:model-value="update('isInspection', $event as boolean)"
        />
      </div>
      <div v-if="modelValue.isInspection" class="form-row radio-row">
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
        v-if="modelValue.isInspection && modelValue.inspectionScope === 2"
        class="mission-picker"
      >
        <p class="picker-hint">{{ t('mission.edit.fields.inspectionSelectMissions') }}</p>
        <div v-if="availableMissions.length === 0" class="picker-empty">
          暂无可用拧紧任务
        </div>
        <label
          v-for="m in availableMissions"
          :key="m.id"
          class="picker-item"
        >
          <Checkbox
            :model-value="boundMissionIds.includes(m.id!)"
            binary
            @update:model-value="toggleBindMission(m.id!)"
          />
          <span>{{ m.name }}</span>
        </label>
      </div>
    </div>
  </form>
</template>

<style scoped>
.mission-form {
  width: 100%;
}

.form-group {
  margin-bottom: 28px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secondary);
  margin: 0 0 10px 0;
}

.form-row {
  display: flex;
  align-items: center;
  height: 40px;
  gap: 20px;
}

.form-row + .form-row {
  margin-top: 2px;
}

.form-row-name {
  height: auto;
  min-height: 40px;
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
}

.form-field {
  flex: 1;
  max-width: 480px;
  position: relative;
}

.field-error {
  font-size: 13px;
  color: var(--p-red-500);
  margin: 2px 0 0 0;
}

.field-spinner {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--p-primary-500);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.radio-row {
  height: auto;
  min-height: 40px;
  align-items: flex-start;
  padding-top: 6px;
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

.mission-picker {
  margin-top: 12px;
  margin-left: 130px;
  padding: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.picker-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
}

.picker-empty {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 8px 0;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  padding: 0 4px;
}

.picker-item:hover {
  background: var(--color-border);
}
</style>
