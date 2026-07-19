import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMissions, saveMission, deleteMission, baseFields } from '@/shared/api/mission'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { ProductMission } from '@/shared/types/mission'

export const useMissionStore = defineStore('mission', () => {
  const missions = ref<ProductMission[]>([])
  const loading = ref(false)
  const pagination = ref({ page: 1, size: 20, total: 0 })
  const searchName = ref('')
  const toast = useToast()
  const { t } = useI18n()

  async function loadMissions(query?: { page?: number; name?: string }) {
    if (query) {
      if (query.page !== undefined) pagination.value.page = query.page
      if (query.name !== undefined) searchName.value = query.name
    }
    loading.value = true
    try {
      const data = await fetchMissions({
        page: pagination.value.page,
        size: pagination.value.size,
        name: searchName.value || undefined,
      })
      missions.value = data.records
      pagination.value.total = data.total
      pagination.value.size = data.size
      pagination.value.page = data.current
    } finally {
      loading.value = false
    }
  }

  async function toggleEnabled(mission: ProductMission) {
    const previous = mission.enabled
    mission.enabled = !mission.enabled
    try {
      const payload = {
        id: mission.id,
        ...baseFields(mission),
        prerequisites: [],
        barcodeRules: [],
      }
      await saveMission(payload, true)
    } catch (e) {
      mission.enabled = previous
      toast.add({ severity: 'error', detail: `${t('mission.list.toggleFailed')}: ${(e as Error).message}`, life: 3000 })
    }
  }

  async function removeMission(id: number) {
    await deleteMission(id)
    await loadMissions()
    toast.add({ severity: 'success', detail: 'mission.delete.success', life: 3000 })
  }

  return { missions, loading, pagination, searchName, loadMissions, toggleEnabled, removeMission }
})
