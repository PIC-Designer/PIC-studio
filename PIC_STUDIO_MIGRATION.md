# PIC Studio 项目迁移记录

更新时间：2026-08-26  
项目负责人：Shengqi Yin / PIC-Designer

## 1. 项目目标

参考 CORNERSTONE Wafer Post-Processing Suite 的 Dashboard 交互方式，建立一个面向光子集成电路设计的 **PIC Studio**。

PIC Studio 不是测试数据分析平台，而是用于：

- 分类、记录和展示不同 PIC 设计；
- 按平台、材料、波长、模式、波导截面、器件类型和版本筛选；
- 展示 Python/GDSFactory 设计函数及参数；
- 自动生成调用设计函数的 Python 代码；
- 后续通过受控执行仅生成 OAS/OASIS 版图、WebP 预览和构建记录。

## 2. GitHub 仓库

### 设计源仓库

- 仓库：<https://github.com/PIC-Designer/PIC_library>
- 可见性：Private
- 功能：保存 GDSFactory 版图库、PDK、基础器件、组合器件和测试芯片。
- Python：>= 3.12
- 主要依赖：`gdsfactory==9.26.0`、`kfactory`、`klayout`、`numpy`、`scipy`、`pyyaml`

主要目录：

```text
PIC_library/
├── basic/
├── couplers/
├── filters/
├── groups/
├── integration/
├── applications/
├── pdk/
│   ├── cornerstone/
│   └── developing/
├── 0_SOI220_dies/
├── 0_SOI340_dies/
├── test_chips/
└── gds_lib_generator.py
```

`pdk/cornerstone` 和 `pdk/developing` 中的 Python 文件不是单个设计，而是分别包含许多设计函数。扫描得到约 280 个可作为 Studio 条目的公开设计函数。

### Dashboard 仓库

- 仓库：<https://github.com/PIC-Designer/PIC-studio>
- 可见性：Private
- 功能：PIC_library 的分类、检索、展示、参数化和自动生成层。
- 当前本地目录：`C:\Users\sy1d24\OneDrive - University of Southampton\Documents\ChatGPT\PICstudio`
- 当前 Git remote：`https://github.com/PIC-Designer/PIC-studio.git`
- 当前分支：`main`
- 注意：截至生成本文档时，本地第一版尚未 commit/push。

两个仓库应保持独立：`PIC_library` 是设计源，`PIC-studio` 是展示和自动化工具，不应把前端代码混入版图库。

## 3. 状态映射

当前采用以下自动映射：

```text
pdk/cornerstone/components_in_platform.py 中注册的器件 → released / Cornerstone
pdk/developing 中的公开设计函数                         → developing / Developing
```

若实际定义不同，需要修改 `scripts/build_catalog.py`。

## 4. 命名解析

现有设计函数名称已经包含可解析的工程信息，例如：

```text
SOI220_cband_TE_strip_apodized_GC_focusing_v1p0
│      │     │  │     │                    │
平台   波段  模式 截面  器件类型             版本
```

目录生成器从名称和函数签名中提取：

- platform
- material
- wavelength / wavelengthNm
- mode
- crossSection
- deviceType
- variant
- version
- status
- source file / line number
- function name
- parameters、annotations、defaults、required

生成结果写入 `public/catalog.json`。扫描器使用 Python AST，只读取源代码，不 import PDK，也不执行设计函数。

## 5. 已实现功能

- React + TypeScript + Vite 单页 Dashboard；
- 深色工程视觉风格；
- 自动索引 280 个设计；
- Cornerstone / Developing 数量统计；
- 平台数量和设计总数统计；
- 按平台、波长、模式、器件类型和状态筛选；
- 设计名称、平台、器件和 variant 搜索；
- 器件卡片及简化几何示意图；
- 设计详情抽屉；
- Python 函数参数、类型和默认值展示；
- 自动生成 quick-start Python 调用示例；
- 跳转到 PIC_library 对应源码行；
- 每次显示 36 个设计，支持继续加载；
- 响应式桌面/移动布局；
- GitHub Pages 构建工作流；
- 每日自动重新同步 PIC_library 的 workflow 配置。

## 6. PIC-studio 主要文件

```text
PIC-studio/
├── .github/workflows/deploy.yml
├── public/catalog.json
├── scripts/build_catalog.py
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── types.ts
├── index.html
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── README.md
```

本地参考仓库位于 `.reference-library/`，已加入 `.gitignore`，不能提交到 PIC-studio。

## 7. 本地运行

需要 Node.js、pnpm 和 Python 3.12+。

```powershell
git clone https://github.com/PIC-Designer/PIC-studio.git
cd PIC-studio

git clone --depth 1 https://github.com/PIC-Designer/PIC_library.git .reference-library

python scripts/build_catalog.py `
  --source .reference-library/pdk `
  --output public/catalog.json

pnpm install
pnpm dev
```

生产构建：

```powershell
pnpm build
pnpm preview
```

Vite 配置的 GitHub Pages base path 是：

```text
/PIC-studio/
```

本地预览地址通常是：

```text
http://127.0.0.1:4173/PIC-studio/
```

## 8. 已完成验证

- Python catalogue 生成成功；
- 生成 280 个设计条目；
- TypeScript 类型检查通过；
- Vite production build 通过；
- 生产 JavaScript 约 205 KB，gzip 后约 65 KB；
- 浏览器验证初始只显示 36 个卡片；
- 搜索可精确筛出单个设计；
- 详情面板、Quick start 和 GitHub 链接可用；
- 页面已在本地 Chrome 中视觉检查。

## 9. GitHub Actions 与 Pages 配置

`PIC_library` 是私有仓库，PIC-studio workflow 需要跨仓库读取权限。

在 `PIC-Designer/PIC-studio` 中配置 Actions secret：

```text
PIC_LIBRARY_TOKEN
```

该 token 应只具有读取 `PIC-Designer/PIC_library` 的最低权限。

GitHub Pages 设置：

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

workflow 文件：`.github/workflows/deploy.yml`

触发方式：

- push 到 `main`；
- workflow_dispatch 手动执行；
- 每日定时同步。

## 10. 已知问题

### SOI340 源文件冲突已解决

已于 2026-08-26 直接检查 GitHub 仓库 `PIC-Designer/PIC_library` 的 `main` 分支。`pdk/cornerstone/SOI340.py` 中已不存在 Git merge conflict 标记，相关函数名称也已统一为正确的 `Integrated` 拼写。

核验时文件 SHA：`73d5f69c01d505afcbc56c0d6598ac07dde47264`。

旧的本地 `.reference-library` 副本曾保留冲突标记，不能代表 GitHub 远端最新版。后续重新生成 catalogue 前应先同步或重新克隆参考版图库。

### 自动分类不是最终权威元数据

当前分类主要依赖函数名称。部分 helper、TFLN 方向、特殊器件或不符合命名规范的设计可能被标为 `Other` 或 `Unspecified`。

后续推荐加入可选 metadata override，例如：

```yaml
id: SOI220_cband_TE_strip_apodized_GC_focusing_v1p0
deviceType: Grating Coupler
platform: SOI220
wavelengthNm: 1550
mode: TE
crossSection: Strip
status: released
description: Apodized focusing grating coupler for C-band TE operation.
```

自动解析提供默认值，人工 metadata 只覆盖例外。

## 11. 下一阶段建议

1. 将当前本地代码 commit 并 push 到 `PIC-Designer/PIC-studio`；
2. 配置 `PIC_LIBRARY_TOKEN` 和 GitHub Pages；
3. 为每个器件生成压缩后的真实 WebP 版图预览；
4. 增加参数编辑表单；
5. 从表单生成可下载 Python 文件；
6. 通过隔离的 GitHub Actions 执行受信任的 GDSFactory 设计；
7. 仅保存 OAS/OASIS 版图、WebP 预览图、构建日志和 commit SHA；
8. 增加设计状态、验证记录、流片记录和版本对比；
9. 建立 metadata override 和 catalogue validation；
10. 将源代码冲突、命名异常和无法解析项显示为 Data Quality 告警。

## 12. 给下一台电脑上的开发助手

开始工作前请先：

1. 阅读本文档和 PIC-studio 的 `README.md`；
2. 检查 `git status`，不要覆盖尚未提交的用户修改；
3. 确认两个私有仓库的访问权限；
4. 克隆 PIC_library 到 `.reference-library`；
5. 重新生成 `public/catalog.json`；
6. 运行 `pnpm install`、`pnpm build`；
7. 在浏览器验证筛选、搜索和详情抽屉；
8. 未经用户确认，不要创建 GitHub token、推送、公开仓库或修改仓库权限。
