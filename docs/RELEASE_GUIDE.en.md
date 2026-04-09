# WorkBuddy Pet GitHub Release Guide

[中文版本](./RELEASE_GUIDE.zh-CN.md)

## 1. Purpose

This guide is for repository maintainers. It explains how to build cross-platform installers with GitHub Actions and publish them to GitHub Releases.

## 2. What Is Already Prepared

The repository already includes:

- `.github/workflows/build-workbuddy.yml`
- `.github/workflows/release-workbuddy.yml`

These workflows build native packages for:

- macOS
- Windows
- Linux

## 3. Recommended Checks Before Releasing

Before you push a release tag, verify:

1. The version in `package.json` is correct
2. The README and user docs are up to date
3. The local smoke tests pass

Run locally:

```bash
npm install
npm run smoke:rules
```

If you want local packaging checks as well:

```bash
npm run pack
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## 4. Official Release Steps

### 4.1 Commit and push your changes

```bash
git add -- .
git commit -m "release: prepare v0.1.0"
git push origin main
```

### 4.2 Create and push a version tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

### 4.3 Wait for GitHub Actions to finish

`release-workbuddy.yml` will automatically:

- install dependencies
- run `npm run smoke:rules`
- generate icons
- build macOS / Windows / Linux packages
- upload the artifacts
- publish them to GitHub Releases

## 5. What End Users Will See

Typical release assets:

- macOS: `dmg`, `zip`
- Windows: `exe`
- Linux: `AppImage`, `deb`

Users can download these files directly and install the app.

## 6. Post-Release Checks

After publishing, verify:

1. The GitHub Release page was created successfully
2. Assets for all three platforms are present
3. The download instructions in the README are still accurate
4. The user guides still match the current UI

## 7. Known Release Notes

- macOS currently uses ad-hoc signing, not full Apple Developer signing
- Formal public distribution will still need notarization and production signing
- Windows and Linux should still be validated on real target systems before wide distribution

## 8. When to Use the Build Workflow

Use `build-workbuddy.yml` for:

- regular PR validation
- cross-platform packaging checks after UI, config, or packaging changes

Use `release-workbuddy.yml` for:

- official version publishing
- creating downloadable GitHub Release assets for end users
