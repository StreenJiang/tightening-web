# 拧紧流程控制系统 — 项目骨架 实现计划

> 状态：已完成 | 文件：20 个源文件，979 行 | 构建：82KB gzipped

**Goal:** 搭建前端骨架：清理模板、安装依赖、i18n、主题系统、布局（顶栏+侧边栏+底栏）、路由、占位页面、404。

**Architecture:** Vue 3 + TS + Vite。模块优先目录。顶栏/侧边栏/底栏常驻布局。路由 `MODULES.map()` 生成，ModulePlaceholderPage 统一占位。Pinia sidebar/theme store（localStorage 持久化）。Hash mode。触摸优先（`usePointerPress` composable + `@media (hover: hover)`）。

**Tech Stack:** Vue 3.5, TS 6.0, Vite 8, Vue Router 4 (hash), Pinia, vue-i18n, @iconify/vue + @iconify-json/mdi。无 UI 组件库。

## 实现清单

| # | 任务 | 产出 |
|---|------|------|
| 1 | 安装依赖 + 清理模板 | `vue-router` `pinia` `vue-i18n` `@iconify/vue` `@iconify-json/mdi` |
| 2 | Vite 路径别名 | `@` → `src/` in vite.config.ts + tsconfig.app.json |
| 3 | 全局样式 | `style.css` 92 行：CSS 变量 + `html.dark` class + `:focus-visible` + `touch-action` + `-webkit-tap-highlight-color` 全局 button 规则 |
| 4 | i18n | `zh-CN.json` + `en.json` + `i18n.ts` + 更新 `main.ts` |
| 5 | Sidebar Store | `sidebar.ts` 32 行：`collapsed` + localStorage 持久化 + `toggle()` |
| 6 | Theme Store | `theme.ts` 38 行：`setMode()` + matchMedia 监听 + `onUnmounted` 清理 + localStorage |
| 7 | 路由 | `router/index.ts` 36 行：`MODULES` 数组 + `.map()` → 6 路由 + 404 catch-all |
| 8 | 共享组件 | `IconButton.vue`(30) `MenuItem.vue`(28) `DeviceIndicator.vue`(30) `PlaceholderCard.vue`(46) |
| 9 | composable | `usePointerPress.ts`(6)：`pressed` ref + `onDown()`/`onUp()` |
| 10 | 页面 | `ModulePlaceholderPage.vue`(18) 统一占位 + `NotFoundPage.vue`(74) 404 |
| 11 | TopBar | `TopBar.vue` 154 行：IconButton×4 + 主题下拉（MenuItem×3，JS 动态定位）+ 语言文字标签 |
| 12 | Sidebar | `Sidebar.vue` 243 行：路由 meta 菜单 + 折叠浮层 + clickLocked 淡出 + 触摸反馈 |
| 13 | FooterBar | `FooterBar.vue` 77 行：时钟 + DeviceIndicator×5（拧紧枪/控制器/PLC/MES/扫描枪） |
| 14 | MainLayout + 入口 | `MainLayout.vue`(42) + `App.vue`(6) + `main.ts`(12) + `index.html` |
| 15 | 验证 | `npm run build` 零错误，82KB gzipped |
