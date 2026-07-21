# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 开发者背景

本项目的 Vue/TypeScript 开发人员是 **Java 后端开发出身**，对 Vue 只有基础了解。生成代码时注意：

- 在 Vue Composition API 中，`setup` 闭包 ≈ Java 实例作用域，模块级变量会跨组件实例共享——这是 Java 开发者容易误解的地方
- `ref`/`reactive` 才是 Vue 的响应式状态，普通 `let` 变量丢失响应式
- Pinia store 承担类似 Spring Service 的角色——数据获取、缓存、增删改都在 store，组件只负责渲染
- 函数/类型超过 30 行时解释为什么需要这么长

## 项目概述

`tightening-web` — 拧紧流程控制前端，Vue 3 + TypeScript + Vite，运行在 N2840 工控机（4GB DDR3，1024×768 触摸屏）。任务管理（Mission）模块已实现完整的 CRUD，包括 Stage 3 产品面/螺栓编辑（Canvas + Dialog UI）。

## 常用命令

```bash
npm run dev       # 启动开发服务器 (Vite HMR)，/api 代理目标由 VITE_API_TARGET 控制
npm run build     # 类型检查 + 生产构建 (vue-tsc -b && vite build)
npm run preview   # 预览生产构建产物
```

## 配套文档

- `CONTEXT.md` — 领域术语词汇表（拧紧任务、站点、螺栓、条码规则等中英对照）
- `DESIGN.md` — 设计令牌（颜色、间距、z-index）与约定（性能、触摸、动画）
- `PRODUCT.md` — 产品定义、用户角色、品牌个性、设计原则

## 技术栈

- **Vue 3.5** — `<script setup lang="ts">` SFC 方式，Composition API
- **TypeScript 6.0** — `erasableSyntaxOnly` 模式，`noUnusedLocals` / `noUnusedParameters` 开启
- **Vite 8** — `@vitejs/plugin-vue`，路径别名 `@/` → `src/`
- **vue-tsc 3** — 模板/组件类型检查
- **PrimeVue 4** — UI 组件库，Aura 主题通过 `definePreset` 扩展品牌色（工业黄 `#c49700`）
- **Vue Router 4** — `createWebHashHistory`，懒加载路由模块
- **Pinia 3** — Composition API 风格 stores
- **vue-i18n 11** — Composition API 模式，默认 zh-CN
- **Valibot 1** — API 响应运行时校验，tree-shakeable

## 项目结构

```
src/
├── main.ts              # 入口：挂载 Pinia/i18n/Router/PrimeVue/Toast/Confirmation/Tooltip
├── App.vue              # 根组件
├── style.css            # 全局样式（CSS 变量 + 亮/暗主题 + 性能优化）
├── i18n.ts              # vue-i18n 配置，zh-CN/en 双语
├── layout/              # MainLayout / TopBar / Sidebar / FooterBar
├── modules/             # 页面模块（mission/workplace/workstation/analysis/device/integration）
├── router/              # MODULES 数组统一注册路由，子路由不显示在侧边栏
├── shared/
│   ├── api/             # request.ts（fetch 封装）+ 各模块 API 函数
│   ├── types/           # 接口定义 + global.d.ts（Window 类型扩展）
│   └── utils/           # 纯函数工具（mission 类型转换、UUID 生成）
├── stores/              # Pinia stores（mission/serverConnection/sidebar/theme）
└── theme/preset.ts      # PrimeVue 主题 preset（Aura + 品牌色覆写 + 暗色模式）
```

## PrimeVue 使用规范

- 所有 **交互控件**（Button、InputText、Dialog、Select、ToggleSwitch 等）统一使用 PrimeVue 组件
- 组件微调优先级：**pt 属性 > Design Token（theme preset） > 原生 props（severity/size/variant） > scoped CSS**
- **自定义内容渲染**（Canvas 绘图、JSON 树、代码块、自定义布局）可用原生 HTML + scoped CSS + PrimeIcons 图标
- ripple 全局关闭（`ripple: false`），暗色模式通过 `.dark` class 切换

## API 层架构

### 请求管道

```
组件 → API 函数 → request.ts (fetch + handleResponse) → 后端
                  ↓
            Valibot schema 校验原始 JSON
                  ↓
            fromApi() 转换为前端类型（0/1 → boolean 等）
```

### 关键约定

- **Boolean 映射**：后端使用 0/1 整数，前端使用 boolean。API 层通过 Valibot 校验原始数据 + `fromApi()` 转换函数处理。保存时 `baseFields()` 反向转换。
- **统一响应格式**：`{ code: 200, data: ... }`，`request.ts` 的 `handleResponse` 检查 HTTP 状态 + `code !== 200`。
- **Mission Detail 缓存**：`GET /{id}` 返回完整 detail（含 sides、图片 Base64），存入 `window.__missionDetail`。子资源（prerequisites、barcodeRules）不再独立请求，直接从缓存读取。
- **开发代理**：Vite `server.proxy` 将 `/api` 转发到 `VITE_API_TARGET`（`.env` 默认 `192.168.1.101:8080`，本机 `.env.local` 覆盖为 `localhost:8080`）。

## TypeScript 规范

- **禁止使用 `any` 类型**。API 边界用 `unknown` + Valibot 校验获取正确类型，无需 `as` 断言。
- **禁止 `as unknown as SomeType` 多级类型断言**。跨边界数据必须用 Valibot 做运行时校验。
- UI 层内部状态（如 `BoltState._partsBarcode`）必须定义专用 interface，不允许用 `any` 或内联交叉类型。
- 接口定义放在 `src/shared/types/` 目录下。

## 路由模式

- Hash history（工控机无 server 端路由支持）
- 模块路由通过 `MODULES` 数组统一注册（path/name/icon/page），自动生成侧边栏菜单
- 子路由（如 `mission/new`、`mission/:id/edit`）手动添加，`meta` 不含 `icon` 故不出现在侧边栏
- 全部页面懒加载：`() => import(...)`

## Pinia Store 模式

全部使用 Composition API 风格：`defineStore('name', () => { ... })`。4 个 store：

| Store | 职责 |
|-------|------|
| `mission` | 任务列表加载/分页/搜索/启禁用/删除 |
| `serverConnection` | 服务器连接状态、配置保存、连接测试 |
| `sidebar` | 侧边栏折叠状态，localStorage 持久化 |
| `theme` | 主题模式（light/dark/system），localStorage + `prefers-color-scheme` |

## 主题系统

- PrimeVue 暗色模式通过 `darkModeSelector: '.dark'` 检测 `html.dark` class
- `useThemeStore` 管理三种模式：light / dark / system（跟随系统 `prefers-color-scheme`）
- 预计算半透明背景色为 CSS 变量（`--color-*-bg`），禁止运行时 `color-mix()` — N2840 性能约束
- 动画仅使用 `transform` 和 `opacity`（GPU 合成层，不触发 paint/layout）
