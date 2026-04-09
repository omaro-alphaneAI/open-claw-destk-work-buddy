# WorkBuddy Pet User Guide

[中文版本](./USER_GUIDE.zh-CN.md)

## 1. What It Is

WorkBuddy Pet is a desktop pet application.

It supports two usage modes:

- `Cute Mode`
  Fully local. No cloud requests.
- `WorkBuddy Mode`
  The pet connects to your own service only after you enter your own `API URL`, `Model`, and `API Key`.

## 2. How to Install

The recommended path is to download from GitHub `Releases`. No local Node.js installation is required.

Download by platform:

- macOS: `*.dmg`
- Windows: `*.exe`
- Linux: `*.AppImage` or `*.deb`

After installation, launch the app directly.

## 3. What Happens on First Launch

On first launch:

- The app starts in `Cute Mode`
- Networking is off by default
- Local context sharing is off by default
- No API key is required to use the app

You can explore the desktop pet, open the chat drawer, and open the workbench before deciding whether to connect your own WorkBuddy backend.

## 4. How to Switch to WorkBuddy Mode

1. Open the workbench
2. Turn on `WorkBuddy Mode`
3. Fill in:
   - Provider label
   - API URL
   - Model
   - API key
4. Save the API key
5. Start chatting

## 5. What Kind of API URL Is Supported

The app supports OpenAI-compatible endpoints:

- `Chat Completions`
  Example: `/v1/chat/completions`
- `Responses API`
  Example: `/v1/responses`

You can leave the protocol setting on `Auto`, and the app will infer the correct style from the URL.

## 6. Security Restrictions

To reduce accidental data leakage, outbound WorkBuddy requests are constrained:

- `HTTPS` is required by default
- `HTTP` is allowed only for loopback addresses such as `localhost`, `127.0.0.1`, or `::1`
- Redirects are blocked
- Embedded usernames and passwords in `API URL` are blocked
- Sensitive query params such as `token`, `api_key`, or `password` are blocked

If a configuration violates these rules, the app blocks it instead of sending the request.

## 7. What Is Not Sent by Default

The following are not sent to remote services by default:

- Local paths
- Local file contents
- Foreground app names and window titles
- Code diffs
- Environment variables
- Clipboard contents
- User home directory information
- Local identity/profile files

Extra local context is only shared if you explicitly turn on the related switches.

## 8. What “Explicitly Share Context” Means

If that switch is enabled, the app may add a small amount of session-related summary context to the system prompt, such as:

- Current intent summary
- A few recent ambient summary lines

Before that content is added to the request, the app performs local redaction. Common items such as:

- Local file paths
- Obvious tokens / API keys
- `Bearer ...`

are replaced before the request is sent.

## 9. Where the API Key Is Stored

- macOS / Windows
  The app prefers system-backed secure storage
- Linux
  If secure persistence is unavailable, the key is stored only for the current session and must be entered again after restart

## 10. How to Import Your Own Pet Image

1. Open the workbench
2. Click `Import Pet Image`
3. Choose your image file
4. After import, click `Use My Pet`

Supported formats include:

- `png`
- `jpg`
- `jpeg`
- `webp`
- `gif`

## 11. Daily Usage Recommendations

- Want a pure companion pet: stay in `Cute Mode`
- Want your own AI companion: switch to `WorkBuddy Mode`
- Want the strictest privacy posture: keep all extra-sharing switches off
- Want to avoid accidental disclosure: do not type sensitive content into the chat box

## 12. FAQ

### 12.1 Why does it still not reply after I filled the API settings

Check:

- Is the `API URL` correct
- Is the model name correct
- Has the API key been saved
- Does the URL comply with the security restrictions

### 12.2 Why is my API key gone after restarting on Linux

That usually means the current Linux environment does not provide secure persistent storage, so the app correctly fell back to session-only storage.

### 12.3 Why do I see “Blocked”

That means the app intentionally blocked an unsafe or non-compliant WorkBuddy configuration. Common reasons:

- Remote `HTTP`
- Embedded credentials in the URL
- Sensitive query parameters in the URL

### 12.4 Can I use the app without any API

Yes. That is `Cute Mode`, and it stays offline.

## 13. Platform Notes

- macOS
  Most complete feature set, including system voice output and foreground window sensing
- Windows
  Usable as both a desktop pet and a WorkBuddy client
- Linux
  Usable as both a desktop pet and a WorkBuddy client, but persistent API key storage depends on the system keyring/backend
