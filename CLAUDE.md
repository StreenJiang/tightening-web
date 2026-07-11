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

## 技术栈

- **Vue 3.5** — `<script setup lang="ts">` SFC 方式，Composition API
- **TypeScript 6.0** — `erasableSyntaxOnly` 模式，不允许未使用的局部变量/参数
- **Vite 8** — 构建工具，`@vitejs/plugin-vue` 插件
- **vue-tsc** — 模板/组件类型检查

## 项目结构

```
src/
├── main.ts          # 入口：createApp(App).mount('#app')
├── App.vue          # 根组件
├── style.css        # 全局样式（CSS 变量 + 亮/暗主题）
├── components/      # 可复用组件
└── assets/          # 静态资源（图片、SVG 等）
```

- `tsconfig.app.json` — 应用代码（`src/`）的 TS 配置，继承 `@vue/tsconfig/tsconfig.dom.json`
- `tsconfig.node.json` — Vite 配置文件的 TS 配置，module 模式为 `nodenext`
- `vite.config.ts` — Vite 配置入口

## 当前状态

项目使用 Vue/Vite 官方模板初始化，尚未添加路由（vue-router）、状态管理（Pinia）或任何业务逻辑。`HelloWorld.vue` 是模板自带的演示组件，后续可替换。
