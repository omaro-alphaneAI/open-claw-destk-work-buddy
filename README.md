# WorkBuddy Pet

<div align="center">
  <p>安装后就能直接用的本地优先桌宠。没有 API key，它就是卖萌陪伴；填入你自己的 API URL、Model 和 API key 后，它会变成你的 WorkBuddy。</p>
</div>

<div align="center">

![Build](https://img.shields.io/github/actions/workflow/status/omaro-alphaneAI/open-claw-destk-work-buddy/build-workbuddy.yml?branch=main&label=build)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-f4c76a)
![Electron](https://img.shields.io/badge/Electron-35.x-1f1f1f)
![API](https://img.shields.io/badge/API-OpenAI--compatible-e9b44c)
![Privacy](https://img.shields.io/badge/privacy-local--first-efe7da)

</div>

<div align="center">
  <a href="https://github.com/omaro-alphaneAI/open-claw-destk-work-buddy/releases">下载 Releases</a>
  ·
  <a href="#演示截图">演示截图</a>
  ·
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#隐私默认">隐私默认</a>
  ·
  <a href="./docs/USER_GUIDE.zh-CN.md">用户指南</a>
  ·
  <a href="./README.en.md">English README</a>
</div>

---

<p align="center">
  <img src="./docs/screenshots/07-clone-rack-and-composer.png" alt="WorkBuddy Pet 总览界面" width="360" />
</p>

## 为什么做这个

很多桌面助手一上来就要求登录、绑定固定云服务，或者默认把本机上下文往外发。`WorkBuddy Pet` 反过来做：先给你一个可以直接陪伴、提醒、卖萌的桌宠，再由你决定要不要接入自己的模型和接口。

它默认是本地优先的。没有 API key 时，它只是桌宠；只有当你明确填入自己的 `API URL`、`Model`、`API key` 之后，它才会变成你的 WorkBuddy。

## 你会得到什么

- 装完就能直接用，不填 API 也能进入 `Cute Mode`
- `WorkBuddy Mode` 直接对接你自己的 OpenAI-compatible 接口
- 默认不上传本机路径、文件内容、窗口标题、diff、环境变量、剪贴板
- 内置工作台、运行摘要、快捷动作、对话流和补丁监视视图
- 支持自定义宠物图片，能把你自己的宠物图做成桌宠
- 支持 macOS / Windows / Linux 三端打包和 GitHub Releases 分发

## 两种模式

| 模式 | 需要 API | 说明 |
| --- | --- | --- |
| `Cute Mode` | 否 | 本地卖萌、提醒、陪伴、活动行为都能直接工作 |
| `WorkBuddy Mode` | 是 | 用户填入自己的 `API URL`、`Model`、`API key` 后，桌宠变成自己的工作伙伴 |

## 演示截图

### 工作台与配置

| 记忆与摘要 | 运行摘要 |
| --- | --- |
| ![伴伴记忆与运行摘要](./docs/screenshots/01-memory-and-summary.png) | ![WorkBuddy 运行摘要与快捷动作](./docs/screenshots/02-setup-summary-and-actions.png) |
| WorkBuddy 会把摘要、最近任务和分身使用情况收在工作台里。 | 配置未完成时，会明确提示缺少 API URL、模型名和 API key。 |

| 基础设置 | 协议与接口配置 |
| --- | --- |
| ![WorkBuddy 基础设置](./docs/screenshots/03-workbuddy-settings.png) | ![WorkBuddy 接口配置上半区](./docs/screenshots/04-provider-config-top.png) |
| 可以调节安静模式、气泡时长、陪伴间隔、界面尺寸和活跃度。 | 支持自动识别、`Chat Completions`、`Responses API` 三种协议模式。 |

| API key 与宠物导入 | 补丁监视 |
| --- | --- |
| ![WorkBuddy 接口配置下半区](./docs/screenshots/05-provider-config-bottom.png) | ![补丁猫代码监视器](./docs/screenshots/06-diff-viewer.png) |
| 用户可以保存自己的 API key，也可以导入自己的宠物图片。 | 没有代码改动时，监视器会明确显示当前没有 patch。 |

### 对话与分身

| 分身架与输入框 | 对话流 |
| --- | --- |
| ![分身架与直接输入](./docs/screenshots/07-clone-rack-and-composer.png) | ![快捷动作与系统回包](./docs/screenshots/08-chat-feed-and-actions.png) |
| 分身架可以把任务分给不同角色，底部输入框可直接和桌宠对话。 | 工作台里可以直接触发总结、代码、调研、巡航等快捷动作。 |

### 桌宠形象

| 默认黑猫 | 自定义宠物图片 |
| --- | --- |
| ![默认黑猫桌宠](./docs/screenshots/09-black-cat-skin.png) | ![自定义宠物图片桌宠](./docs/screenshots/10-custom-pet-skin.png) |
| 默认自带黑猫桌宠。 | 也可以换成你自己的宠物图片形象。 |

## 快速开始

### 方式 1：直接下载使用

1. 打开 [GitHub Releases](https://github.com/omaro-alphaneAI/open-claw-destk-work-buddy/releases)
2. 下载对应平台安装包
3. 安装并启动应用
4. 不填 API 也能直接进入 `Cute Mode`
5. 想切到 `WorkBuddy Mode` 时，再去工作台填写：
   - `API URL`
   - `Model`
   - `API key`
6. 如果想换桌宠形象，直接导入自己的宠物图片

### 方式 2：从源码运行

```bash
npm install
npm run dev
```

### macOS 一键桌面启动器

打包完成后，可以把 app 安装到 `~/Applications`，并在桌面生成一个 `桌宠.app` 启动器：

```bash
npm run dist:mac
npm run desktop:install
```

## 隐私默认

默认情况下，`WorkBuddy Mode` 只会发送用户当前明确输入的文本。

默认不会发给远端的内容：

- 本机路径
- 本机文件内容
- 前台窗口标题和应用名
- 代码改动快照
- 环境变量
- 剪贴板
- 用户目录信息
- 任何本地身份描述文件

额外的出站保护：

- 默认只允许 `HTTPS`
- `HTTP` 只允许 `localhost`、`127.0.0.1`、`::1` 这类 loopback 地址
- 禁止请求重定向到其他地址
- 禁止在 `API URL` 中内嵌账号、密码或敏感 query 参数
- 显式共享的上下文会先在本地脱敏，再进入请求

### API key 存储

- macOS / Windows：优先走 Electron `safeStorage`
- Linux：如果运行环境只能提供不安全的 `basic_text` 后端，则只保留在当前会话内存里

## API 兼容

`WorkBuddy Mode` 当前走通用的 OpenAI-compatible 请求层：

- 请求方法：`POST`
- 鉴权方式：`Authorization: Bearer <apiKey>`
- 支持协议：
  - `自动识别`
  - `Chat Completions`
  - `Responses API`

自动识别规则：

- `/v1/chat/completions` -> `Chat Completions`
- `/v1/responses` -> `Responses API`

所以只要你的“龙虾”接口兼容上面任意一种路由，就可以直接接入；如果不是这个格式，需要继续改 [src/main/workbuddy-provider.js](./src/main/workbuddy-provider.js)。

## 文档

- [用户操作指南（中文）](./docs/USER_GUIDE.zh-CN.md)
- [User Guide (English)](./docs/USER_GUIDE.en.md)
- [GitHub 发布指南（中文）](./docs/RELEASE_GUIDE.zh-CN.md)
- [GitHub Release Guide (English)](./docs/RELEASE_GUIDE.en.md)

## 开发与构建

### 本地开发

```bash
npm install
npm run dev
npm run smoke:rules
```

### 打包命令

```bash
npm run pack
npm run dist:mac
npm run dist:win
npm run dist:linux
```

### GitHub Actions

仓库已经包含三端构建和发布工作流：

- [build-workbuddy.yml](./.github/workflows/build-workbuddy.yml)
- [release-workbuddy.yml](./.github/workflows/release-workbuddy.yml)

发布 tag 后即可自动构建并上传 Release 产物：

```bash
git tag v0.1.0
git push origin v0.1.0
```
