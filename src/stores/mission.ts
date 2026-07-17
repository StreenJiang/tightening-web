import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMissions, updateMission, deleteMission } from '@/shared/api/mission'
import { useToastStore } from './toast'
import type { ProductMission } from '@/shared/types/mission'

export const useMissionStore = defineStore('mission', () => {
  const missions = ref<ProductMission[]>([])
  const loading = ref(false)
  const pagination = ref({ page: 1, size: 20, total: 0 })
  const searchName = ref('')

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
    mission.enabled = mission.enabled === 1 ? 0 : 1
    try {
      await updateMission(mission.id!, { ...mission, enabled: mission.enabled })
    } catch {
      mission.enabled = previous
      useToastStore().show('mission.list.toggleFailed', 'error')
    }
  }

  async function removeMission(id: number) {
    await deleteMission(id)
    await loadMissions()
    useToastStore().show('mission.delete.success', 'success')
  }

  return { missions, loading, pagination, searchName, loadMissions, toggleEnabled, removeMission }
})
