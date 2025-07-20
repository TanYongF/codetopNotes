# Codetop Notes 增强插件

## 插件简介

Codetop Notes 增强插件是一款专为 [codetop.cc](https://codetop.cc) 题库用户打造的本地笔记增强工具。它可以在题目列表每行自动插入“自定义笔记”按钮，支持 Markdown 编辑、实时预览、批量导入/导出等功能，帮助你高效管理刷题笔记，提升学习效率。

---

## 主要功能

- **本地笔记存储**：所有笔记均保存在本地浏览器 IndexedDB，数据安全、隐私有保障。
- **Markdown 编辑器**：内置 EasyMDE 编辑器，支持实时预览、代码高亮、快捷键等。
- **批量导入/导出**：支持一键导出全部笔记为 JSON 文件，支持从 codetop API 或插件格式批量导入。
- **笔记状态高亮**：有笔记的题目按钮自动高亮，方便快速定位。
- **全屏编辑体验**：笔记编辑弹窗支持全屏，编辑区与预览区 6:4 分屏，体验更佳。
- **快捷操作**：支持 ESC 快捷键关闭弹窗，操作流畅。
- **兼容性强**：无需服务器，纯前端实现，支持主流浏览器。

---

## 使用说明

1. **安装插件**
   - 通过 Tampermonkey 油猴脚本管理器安装本插件（`.user.js` 文件）。

2. **使用笔记功能**
   - 打开 [codetop.cc](https://codetop.cc) 题库页面。
   - 在每道题右侧会自动出现“📝”自定义笔记按钮。
   - 点击按钮弹出 Markdown 编辑器，可编辑并保存当前题目的专属笔记。

3. **导出/导入笔记**
   - 页面右下角悬浮有“导出笔记”“codetop导入”“插件导入”按钮。
   - **导出笔记**：一键导出所有笔记为 JSON 文件，建议定期备份。
   - **codetop导入**：支持从 codetop API 导出的 JSON 格式批量导入。
   - **插件导入**：支持从本插件导出的 JSON 文件批量导入。

4. **数据安全与备份**
   - 所有笔记仅保存在本地浏览器，**不会上传到服务器**。
   - 建议定期使用“导出笔记”功能备份，防止浏览器清理数据导致丢失。

5. **常见问题**
   - **笔记丢失？** 可能是浏览器清理了站点数据，请及时备份。
   - **无法保存？** 请检查浏览器是否支持 IndexedDB，或是否在隐私/无痕模式下。
   - **如何恢复？** 通过“插件导入”功能导入之前导出的 JSON 文件即可恢复。

---

## 注意事项

- 插件仅在 [codetop.cc](https://codetop.cc) 题库页面生效。
- 请勿在隐私/无痕模式下长期使用，避免数据丢失。
- 插件为本地增强工具，**不会上传或同步你的笔记内容**，请自行做好备份。

---

如有建议或问题，欢迎反馈与交流！


# 📝 Codetop 油猴外挂笔记插件需求文档

## 🎯 产品目标
为 codetop.cc 开发一款油猴外挂插件，帮助用户在题目页面上直接创建、查看、同步个人笔记，并支持本地数据库（IndexedDB）存储，提升刷题笔记管理与复习效率。

> **当前阶段：仅实现本地存储，暂不考虑远程 API 同步。**

---

## 🔑 核心功能

### 1. 自定义笔记按钮插入 —— 设计思路
- **目标**：在题目列表表格每一行的“笔记”按钮旁，插入一个自定义的笔记按钮，实现与原有按钮风格一致的交互入口。
- **核心流程**：
  1. **定位表格与按钮**：
     - 通过 DOM 查询，定位到 `/html/body/div/div/main/div/div/div[5]/div[3]/table/tbody/tr/td[7]/div/button[2]/span`，即每行操作栏的“笔记”按钮。
  2. **插入自定义按钮**：
     - 在上述按钮的后方插入自定义按钮，按钮样式、尺寸、icon 与原按钮保持一致，可用 `classList` 复制原按钮样式。
     - 按钮内容可为“📝”或自定义 SVG。
  3. **监听表格变化**：
     - 由于表格支持分页、筛选、动态渲染，需通过 MutationObserver 或定时轮询，监听表格 DOM 变化，确保每次渲染后都能插入自定义按钮。
     - 插入前需判断是否已存在自定义按钮，避免重复插入。
  4. **按钮交互设计**：
     - Hover 时显示“自定义笔记”提示。
     - 点击后弹出笔记编辑/查看浮层（Modal），宽 60%，高 80%。
     - 浮层内根据本地是否有笔记数据，切换编辑/展示模式。
  5. **与原按钮的关系**：
     - 不影响原“笔记”按钮功能，二者可独立存在。
     - 可根据需求决定是否合并交互（如合并为下拉菜单等，当前建议独立）。

---

### 2. 笔记状态与交互
- **未提交笔记**：本地无笔记数据，点击按钮弹出 Markdown 编辑器，支持实时预览，点击“上传笔记”后保存到本地（IndexedDB）。
- **已提交笔记**：本地存在笔记，点击按钮弹出 Markdown 渲染页面，支持代码高亮、图片渲染，可切换到编辑模式。

### 3. 本地数据库（IndexedDB）集成
- 所有笔记数据均存储于浏览器 IndexedDB。
- 数据结构：
  - 数据库名：`codetop_notes`
  - 表名：`notes`
  - 主键：`leetcode`（题目 ID）
  - 字段：
    - `leetcode`：题目 ID（number）
    - `content`：Markdown 格式笔记内容（string）
    - `updated_at`：时间戳（number）
    - `leetcodeInfo`：题目信息（object，可选）

### 4. 导入功能
- 在笔记界面提供“批量导入”按钮
- 用户可输入（或粘贴）JSON 格式数据源 URL
- 通过 GET 请求获取 JSON 内容，格式需为 codetop notes API 返回的数组：

```json
[
  {
    "leetcode": 115,
    "content": "...markdown...",
    "leetcodeInfo": { "id": 115, "title": "最小的k个数", ... }
  },
  ...
]
```
- 解析后批量插入 IndexedDB，按 leetcode 字段去重（已存在则覆盖或跳过）。
- 同步更新本地缓存。

---

## 📊 数据结构

- **IndexedDB**
  - 数据库名：`codetop_notes`
  - 表名：`notes`
  - 主键：`leetcode`
  - 示例：

```js
{
  leetcode: 115,
  content: "...markdown...",
  updated_at: 1710000000000,
  leetcodeInfo: { id: 115, title: "最小的k个数", ... }
}
```

---

## 🖥️ UI 设计要求
- 表格每行操作栏“笔记”按钮旁插入自定义按钮，样式与原按钮一致
- 笔记按钮：Hover 提示，点击弹出浮层（Modal），宽 60%，高 80%
- Markdown 编辑器：EasyMDE，编辑区+预览区双栏布局
- 展示模式：marked 渲染，highlight.js 代码高亮
- 导入功能：URL 输入框+“解析并导入”按钮

---

## ⚠️ 边界场景
- 网络异常 ➔ 显示“保存到本地，稍后同步”提示
- 数据库异常 ➔ 显示错误提示

---

## 🚀 技术实现要点
- 油猴元信息块配置 @grant GM_setValue / GM_getValue / GM_xmlhttpRequest
- IndexedDB 封装（可用 idb 库或原生 API）
- Markdown 渲染库（marked + highlight.js）
- JS CDN 动态引入 EasyMDE 编辑器与样式
- **按钮插入逻辑需监听表格渲染/分页变化，保证每行都能插入自定义按钮**

---

## 📦 依赖建议
- [EasyMDE](https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js)
- [marked](https://cdn.jsdelivr.net/npm/marked/marked.min.js)
- [highlight.js](https://cdn.jsdelivr.net/npm/highlight.js/lib/common.min.js)
- [idb](https://cdn.jsdelivr.net/npm/idb/build/iife/index-min.js)（可选，简化 IndexedDB 操作）

---

## 📌 开发重点（当前阶段）
1. IndexedDB 数据结构与操作封装
2. 油猴脚本基础结构与按钮插入（表格行级，需适配表格刷新/分页）
3. Markdown 编辑器与渲染集成
4. 批量导入功能实现（解析 codetop notes API 格式 JSON）
5. UI 交互与样式适配

---

## 未来可拓展
- 远程 API 同步（Token 鉴权）
- 云笔记/Notion 集成
- 多端同步

---

如有补充需求或特殊偏好，请继续告知！