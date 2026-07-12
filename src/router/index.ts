import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const MODULES = [
  { path: 'workplace',    name: 'Workplace',    icon: 'mdi:monitor-screenshot',      page: () => import('@/modules/WorkplacePage.vue') },
  { path: 'mission',      name: 'Mission',      icon: 'mdi:clipboard-text-outline',   page: () => import('@/modules/MissionPage.vue') },
  { path: 'workstation',  name: 'Workstation',  icon: 'mdi:worker',                   page: () => import('@/modules/WorkstationPage.vue') },
  { path: 'analysis',     name: 'Analysis',     icon: 'mdi:chart-bar',                page: () => import('@/modules/AnalysisPage.vue') },
  { path: 'device',       name: 'Device',       icon: 'mdi:cog',                      page: () => import('@/modules/DevicePage.vue') },
  { path: 'integration',  name: 'Integration',  icon: 'mdi:connection',               page: () => import('@/modules/IntegrationPage.vue') },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/workplace',
    children: MODULES.map(m => ({
      path: m.path,
      name: m.name,
      meta: { titleKey: `menu.${m.path}`, icon: m.icon },
      component: m.page,
    })),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/modules/NotFoundPage.vue'),
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })
export default router
