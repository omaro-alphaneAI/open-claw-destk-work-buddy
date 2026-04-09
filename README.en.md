# WorkBuddy Pet

[中文 README](./README.md)

Detailed docs:

- [User Guide (English)](./docs/USER_GUIDE.en.md)
- [用户操作指南（中文）](./docs/USER_GUIDE.zh-CN.md)
- [GitHub Release Guide (English)](./docs/RELEASE_GUIDE.en.md)
- [GitHub 发布指南（中文）](./docs/RELEASE_GUIDE.zh-CN.md)

WorkBuddy Pet is a privacy-first desktop pet for macOS, Windows, and Linux.

It has two operating modes:

- `Cute Mode`
  Fully local. The pet stays on your desktop, acts cute, and does not make cloud requests.
- `WorkBuddy Mode`
  The pet becomes your personal work companion only after you enter your own `API URL`, `Model`, and `API Key`.

Users can also import their own pet image and turn it into a desktop pet skin.

## Highlights

- Usable immediately after install, even without an API
- No default upload of local paths, files, window titles, diffs, environment variables, or clipboard data
- API keys are not stored in the normal preferences JSON
- On Linux, if secure persistence is not available, the API key falls back to memory-only session storage
- Supports OpenAI-compatible `Chat Completions` and `Responses API`
- Supports custom pet images
- Ready for GitHub Releases distribution across all three desktop platforms

## Quick Start

1. Download the installer for your platform from GitHub `Releases`
2. Install and launch the app
3. Start with `Cute Mode`
4. If you want your own WorkBuddy, open the workbench and configure:
   - Provider label
   - API URL
   - Model
   - API key
5. If you want a custom pet look, import your own image

For full instructions:

- [User Guide (English)](./docs/USER_GUIDE.en.md)
- [用户操作指南（中文）](./docs/USER_GUIDE.zh-CN.md)

## Privacy and Security

In `WorkBuddy Mode`, the app sends only the text the user explicitly enters by default.

The following are not sent to remote services by default:

- Local file paths
- Local file contents
- Foreground app names and window titles
- Code diffs
- Environment variables
- Clipboard contents
- User home directory information
- Any local identity/profile files

Extra local context is only shared when the user explicitly turns on the related switches.

Outbound safeguards:

- `HTTPS` is required by default
- `HTTP` is allowed only for local loopback endpoints such as `localhost`, `127.0.0.1`, or `::1`
- Redirects are blocked
- Embedded credentials and sensitive query params in `API URL` are blocked
- Explicitly shared context is locally redacted before it is added to a request

### API Key Storage

- macOS / Windows
  Prefer Electron `safeStorage`
- Linux
  Falls back to session-only storage if secure persistence is unavailable

## API Compatibility

`WorkBuddy Mode` uses a generic OpenAI-compatible request layer:

- User provides a full `API URL`
- Method: `POST`
- Auth: `Authorization: Bearer <apiKey>`
- Supported protocol styles:
  - `Auto`
  - `Chat Completions`
  - `Responses API`

Auto detection rules:

- `/v1/chat/completions` -> `Chat Completions`
- `/v1/responses` -> `Responses API`

If your Lobster-compatible endpoint matches either route, it can be connected directly.

## Download from GitHub

For end users, GitHub Releases is the recommended path. No local Node.js setup or manual packaging is required.

Typical release assets:

- macOS: `*.dmg`
- Windows: `*.exe`
- Linux: `*.AppImage` or `*.deb`

## Development

```bash
npm install
npm run dev
```

## Build Commands

```bash
npm run pack
npm run dist:mac
npm run dist:win
npm run dist:linux
```

## GitHub Release Flow

The repository already includes cross-platform build and release workflows:

- `.github/workflows/build-workbuddy.yml`
- `.github/workflows/release-workbuddy.yml`

Publish a tagged release with:

```bash
git tag v0.1.0
git push origin v0.1.0
```

For full release steps:

- [GitHub Release Guide (English)](./docs/RELEASE_GUIDE.en.md)
- [GitHub 发布指南（中文）](./docs/RELEASE_GUIDE.zh-CN.md)
