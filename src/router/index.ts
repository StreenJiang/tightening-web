import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const MODULES = [
  { path: 'workplace',    name: 'Workplace',    icon: 'pi pi-desktop',       page: () => import('@/modules/WorkplacePage.vue') },
  { path: 'mission',      name: 'Mission',      icon: 'pi pi-clipboard',      page: () => import('@/modules/mission/MissionListPage.vue') },
  { path: 'workstation',  name: 'Workstation',  icon: 'pi pi-wrench',         page: () => import('@/modules/WorkstationPage.vue') },
  { path: 'analysis',     name: 'Analysis',     icon: 'pi pi-chart-bar',      page: () => import('@/modules/AnalysisPage.vue') },
  { path: 'device',       name: 'Device',       icon: 'pi pi-cog',            page: () => import('@/modules/DevicePage.vue') },
  { path: 'integration',  name: 'Integration',  icon: 'pi pi-link',           page: () => import('@/modules/IntegrationPage.vue') },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/workplace',
    children: [
      ...MODULES.map(m => ({
        path: m.path,
        name: m.name,
        meta: { titleKey: `menu.${m.path}`, icon: m.icon },
        component: m.page,
      })),
      // 子路由 — 不在侧边栏菜单中显示
      { path: 'mission/new',      name: 'MissionNew',  component: () => import('@/modules/mission/MissionEditPage.vue') },
      { path: 'mission/:id/edit', name: 'MissionEdit', component: () => import('@/modules/mission/MissionEditPage.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/modules/NotFoundPage.vue'),
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })
export default router
