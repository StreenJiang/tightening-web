# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

`tightening-web` — Vue 3 + TypeScript + Vite 前端应用，当前处于初始脚手架阶段。

## 常用命令

```bash
npm run dev       # 启动开发服务器 (Vite HMR)
npm run build     # 类型检查 + 生产构建 (vue-tsc -b && vite build)
npm run preview   # 预览生产构建产物
```

## PrimeVue 使用规范

- 所有 UI 组件统一使用 **PrimeVue v4 styled 模式**（非 unstyled）
- 组件微调优先级：**pt 属性 > Design Token（theme preset） > 原生 props（severity/size/variant） > scoped CSS**
- 只有 PrimeVue 原生方式无法实现时，才使用 scoped CSS
- 全局主题变量定义在 `src/theme/preset.ts`，通过 `definePreset` 扩展 Aura

## 技术栈

- **Vue 3.5** — `<script setup lang="ts">` SFC 方式，Composition API
- **TypeScript 6.0** — `erasableSyntaxOnly` 模式，不允许未使用的局部变量/参数
- **Vite 8** — 构建工具，`@vitejs/plugin-vue` 插件
- **vue-tsc** — 模板/组件类型检查
- **PrimeVue 4** — UI 组件库，Aura 主题
- **Vue Router 4** — 路由管理
- **Pinia** — 状态管理
- **vue-i18n** — 国际化

## 项目结构

```
src/
├── main.ts              # 入口：createApp(App).mount('#app')
├── App.vue              # 根组件
├── style.css            # 全局样式（CSS 变量 + 亮/暗主题）
├── i18n.ts              # vue-i18n 配置
├── layout/              # 布局组件（MainLayout/TopBar/Sidebar/FooterBar）
├── modules/             # 页面模块（mission/workplace/...）
├── router/              # 路由配置
├── shared/
│   ├── api/             # API 层（request.ts + 各模块 api）
│   └── types/           # 类型定义
├── stores/              # Pinia stores
├── theme/               # PrimeVue 主题 preset
└── locales/             # i18n 语言文件（zh-CN.json / en.json）
```

## TypeScript 规范

- **禁止使用 `any` 类型**。所有变量、参数、返回值必须有明确类型。`any` 会导致类型检查失效，数据丢失 bug 难以发现。
  - API 边界（`JSON.parse` 返回值）无法避免时，用 `unknown` 并做类型守卫。
  - 模板 `ref` 回调参数可用 `unknown` + `as` 断言。
  - UI 层内部状态（如 `_partsBarcode`）必须定义专用 interface，不允许用 `any` 或内联交叉类型。

- **禁止 `as unknown as SomeType` 多级类型断言**。这类断言完全绕过类型检查，等价于隐式 `any`。
  - 所有数据结构必须定义明确的 `interface`，而不是用 `Record<string, unknown>` 或泛型 map 替代。
  - 跨边界数据（API 响应、组件间 sync 回调、localStorage 读写）必须用 **Zod / Yup / Valibot** 做运行时校验，推荐 Valibot（tree-shakeable，体积小）。校验通过的 data 直接获得正确的 TypeScript 类型，无需任何 `as` 断言。
- 接口定义统一放在 `src/shared/types/` 目录下。

## 当前状态

项目已完成基础脚手架搭建，包含路由、状态管理、i18n、PrimeVue v4 styled 模式主题。任务管理（Mission）模块已实现列表页和编辑页，包括搜索、分页、增删改查等完整功能。
