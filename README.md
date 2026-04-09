# WorkBuddy Pet

[English README](./README.en.md)

详细文档：

- [用户操作指南（中文）](./docs/USER_GUIDE.zh-CN.md)
- [User Guide (English)](./docs/USER_GUIDE.en.md)
- [GitHub 发布指南（中文）](./docs/RELEASE_GUIDE.zh-CN.md)
- [GitHub Release Guide (English)](./docs/RELEASE_GUIDE.en.md)

一个默认本地、默认防泄漏、面向 macOS / Windows / Linux 的桌宠应用。

它有两种模式：

- `Cute Mode`
  不联网，只在本机卖萌、陪伴、提醒。
- `WorkBuddy Mode`
  用户填入自己的 `API URL`、`Model`、`API Key` 后，桌宠才会通过用户指定的接口变成自己的工作伙伴。

用户还可以导入自己喜欢的宠物图片，把它变成桌面桌宠。

## 核心特点

- 装好就能直接用，不填 API 也能工作
- 默认不上传本机路径、文件内容、窗口标题、diff、环境变量、剪贴板
- API key 不写入普通偏好 JSON
- Linux 没有安全持久化能力时，API key 自动退回当前会话内存保存
- 支持 OpenAI-compatible `Chat Completions` / `Responses API`
- 支持自定义宠物图片
- 支持 GitHub Releases 三端分发

## 用户怎么开始

1. 去 GitHub `Releases` 页面下载对应平台安装包
2. 安装并启动应用
3. 直接使用 `Cute Mode`
4. 如果要接入自己的 WorkBuddy，再进入工作台配置：
   - 服务名称
   - API URL
   - 模型名
   - API key
5. 如果要换宠物形象，导入自己的图片

详细步骤见：

- [用户操作指南（中文）](./docs/USER_GUIDE.zh-CN.md)
- [User Guide (English)](./docs/USER_GUIDE.en.md)

## 隐私与安全

`WorkBuddy Mode` 下，默认只会发送用户当前明确输入的文本。

默认不会发给远端的内容：

- 本机路径
- 本机文件内容
- 前台窗口标题和应用名
- 代码改动快照
- 环境变量
- 剪贴板
- 用户目录信息
- 任何本地身份描述文件

只有当用户显式打开相关开关时，才允许额外共享有限的本地上下文。

额外的出站保护：

- 默认只允许 `HTTPS`
- `HTTP` 只允许 `localhost / 127.0.0.1 / ::1` 这类本机调试地址
- 禁止请求重定向到别的地址
- 禁止在 `API URL` 里内嵌账号、密码或敏感 query 参数
- 显式共享的上下文会先做本地脱敏，再进入请求

### API key 存储

- macOS / Windows
  优先走 Electron `safeStorage`
- Linux
  如果运行环境只能提供不安全的 `basic_text` 后端，则只保留在当前会话

## API 兼容说明

当前 `WorkBuddy Mode` 走通用的 OpenAI-compatible 请求层：

- 用户提供完整 `API URL`
- 请求方法：`POST`
- 鉴权方式：`Authorization: Bearer <apiKey>`
- 支持三种协议模式：
  - `自动识别`
  - `Chat Completions`
  - `Responses API`

自动识别规则：

- `/v1/chat/completions` -> `Chat Completions`
- `/v1/responses` -> `Responses API`

所以只要“龙虾”兼容这两条中的任意一条，就可以直接接入。

## 从 GitHub 下载

面向最终用户时，推荐直接使用 GitHub Releases，不需要本地安装 Node，也不需要自己打包。

常见下载文件：

- macOS：`*.dmg`
- Windows：`*.exe`
- Linux：`*.AppImage` 或 `*.deb`

## 开发启动

```bash
npm install
npm run dev
```

## 构建命令

```bash
npm run pack
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## GitHub 发布

仓库已经包含三端构建和 Release 工作流：

- `.github/workflows/build-workbuddy.yml`
- `.github/workflows/release-workbuddy.yml`

推送版本标签后即可自动构建并发布：

```bash
git tag v0.1.0
git push origin v0.1.0
```

详细步骤见：

- [GitHub 发布指南（中文）](./docs/RELEASE_GUIDE.zh-CN.md)
- [GitHub Release Guide (English)](./docs/RELEASE_GUIDE.en.md)
