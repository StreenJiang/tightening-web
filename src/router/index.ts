import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const placeholderPage = () => import('@/modules/ModulePlaceholderPage.vue')

const MODULES = [
  { path: 'workplace',    name: 'Workplace',    icon: 'mdi:view-dashboard' },
  { path: 'mission',      name: 'Mission',      icon: 'mdi:clipboard-list' },
  { path: 'workstation',  name: 'Workstation',  icon: 'mdi:monitor-screenshot' },
  { path: 'analysis',     name: 'Analysis',     icon: 'mdi:chart-bar' },
  { path: 'device',       name: 'Device',       icon: 'mdi:cog' },
  { path: 'integration',  name: 'Integration',  icon: 'mdi:connection' },
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
      component: placeholderPage,
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
