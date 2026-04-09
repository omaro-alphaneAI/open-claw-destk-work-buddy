# WorkBuddy Pet GitHub 发布指南

[English Version](./RELEASE_GUIDE.en.md)

## 1. 目标

这份文档面向仓库维护者，说明如何通过 GitHub Actions 自动产出三端安装包，并发布到 GitHub Releases。

## 2. 仓库里已经准备好的内容

当前仓库已经包含：

- `.github/workflows/build-workbuddy.yml`
- `.github/workflows/release-workbuddy.yml`

它们会在 GitHub runner 上分别构建：

- macOS
- Windows
- Linux

## 3. 发布前建议检查

在打 tag 之前，建议先确认：

1. `package.json` 的版本号是否正确
2. README 和用户文档是否已经更新
3. 本地规则测试是否通过

本地可执行：

```bash
npm install
npm run smoke:rules
```

如需本机试打包，可执行：

```bash
npm run pack
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## 4. 正式发布步骤

### 4.1 提交你的代码

```bash
git add -- .
git commit -m "release: prepare v0.1.0"
git push origin main
```

### 4.2 打版本标签

```bash
git tag v0.1.0
git push origin v0.1.0
```

### 4.3 等待 GitHub Actions 完成

`release-workbuddy.yml` 会自动：

- 安装依赖
- 运行 `npm run smoke:rules`
- 生成图标
- 构建 macOS / Windows / Linux 安装包
- 上传产物
- 发布到 GitHub Releases

## 5. 用户会在 Release 里看到什么

常见文件类型：

- macOS：`dmg`、`zip`
- Windows：`exe`
- Linux：`AppImage`、`deb`

用户下载这些文件后就可以直接安装。

## 6. 发布后检查

发布完成后，建议检查：

1. GitHub Release 页面是否生成成功
2. 三个平台产物是否都已上传
3. README 中的下载说明是否仍然准确
4. 用户操作指南是否与当前 UI 一致

## 7. 当前已知注意事项

- macOS 目前是 ad-hoc 签名，不是正式 Apple Developer 签名
- 如果要做正式分发，还需要进一步补 notarization / 正式签名流程
- Windows / Linux 的最终下载安装体验，最好仍在真实环境里各做一次验收

## 8. 何时使用 build workflow

`build-workbuddy.yml` 适合：

- 日常 PR 检查
- 改 UI / 配置 / 打包脚本后做三端构建验证

`release-workbuddy.yml` 适合：

- 正式版本发布
- 需要让用户直接从 GitHub Releases 下载时
