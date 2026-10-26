# Demo Agent App — React Native

A React Native port of [`demo-app`](../demo-app), the Avaya Infinity™ Agent SDK sample
agent desktop. One codebase, three targets: **Android, iOS and web**.

> ⚠️ WARNING
>
> This application is provided as a sample for reference only and shouldn't be used
> in production.

---

## Read this first: the SDK is browser-only

`@avaya/infinity-agent-sdk` v1.0.0 ships a **browser-only** bundle. It is not merely
untested on React Native — it dereferences browser globals at module scope and throws
immediately under Hermes:

| Browser API | Occurrences in the SDK bundle | Why it breaks React Native |
| --- | --- | --- |
| `getUserMedia` / `MediaStream` | 69 / 166 | No RN equivalent without `react-native-webrtc`, and the APIs are not drop-in compatible |
| `RTCPeerConnection` | 19 | Browser WebRTC stack |
| `navigator.mediaDevices` | 49 | Does not exist in Hermes |
| `document.createElement("audio")` | — | **This is the actual call-audio playback path** |
| `document.createElement` (canvas/video/script) | 15 | No DOM in React Native |
| `window.open` | 3 | Popup OAuth mode |
| `localStorage` / `sessionStorage` | 15 | Not available in React Native |

There are no React Native guards in the bundle, and `package.json` exposes a single
`import` target with no `react-native` export condition. Since the SDK currently
supports **voice interactions only**, and voice is exactly what depends on DOM audio
and browser WebRTC, a straight port cannot place a real call on a phone.

**What makes this port work anyway:** the SDK's public typings contain *zero* browser
types — `User`, `Interaction`, `Queue` and every event type are clean. So the UI is
written against a faithful mirror of that API ([`src/sdk/types.ts`](src/sdk/types.ts))
and bound at runtime to whichever implementation the platform supports.

| Target | How the SDK runs | Real tenant? |
| --- | --- | --- |
| **Web** | the real SDK, directly in the page ([`adapter.web.ts`](src/sdk/adapter.web.ts)) | **Yes** — Expo Web is a real browser |
| **iOS / Android** | the real SDK, inside a hidden WebView ([`adapter.native.ts`](src/sdk/adapter.native.ts)) | **Yes** — via the bridge below |

**There is no simulator and no sample data anywhere in this app.** Native either
connects to your tenant or fails with the real error. Metro still keeps the browser
SDK out of the native bundles entirely — native reaches it only through the WebView.
Verified against built bundles:

```
                        web    android   ios
createAudioElement       1        0       0
RTCPeerConnection/…      -        0       0
sample/mock data         0        0       0
```

### How the native bridge works

A WebView *is* a browser, so the SDK runs there unmodified. The native screens stay
native and drive it over `postMessage`:

```
┌───────────── React Native (iOS / Android) ─────────────┐
│  Native screens (the UI in src/components)             │
│          ▲                        │                    │
│   events │                        │ commands           │
│          │                        ▼                    │
│  ┌──── bridge-client.ts ── postMessage ─────────────┐  │
│  │   <WebView hidden>  →  <origin>/?bridge=1        │  │
│  │      the real @avaya/infinity-agent-sdk          │  │
│  │      DOM · WebRTC · call audio                   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

The WebView loads the **web build of this same app** with `?bridge=1`, which renders
[`BridgeHostScreen`](src/components/BridgeHostScreen.tsx) instead of the UI. Reusing
one bundle means the bridge can never drift from the version web runs.

Remote SDK objects are mirrored natively as *snapshots* — readable props plus the
results of every `can*()` predicate, re-sent with each event. So `interaction.canHold()`
on a phone returns what the SDK decided, never a native guess.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- Expo Go (for device testing) — this project targets **Expo SDK 58**

> **Why SDK 58 specifically.** iOS Expo Go is always the latest build from the App
> Store and cannot be downgraded, so it only ever loads the newest SDK. Android is
> flexible — the Expo CLI side-loads whichever Expo Go APK matches the project. That
> makes the newest SDK the only version both platforms can run. If an Android device
> reports "requires a newer version of Expo Go", let the CLI reinstall Expo Go
> (`npx expo start --android`) rather than downgrading the project — that breaks iOS.
- npm v10 or later
- For iOS: macOS with Xcode (or use Expo Go on a device)
- For Android: Android Studio / an emulator (or Expo Go)
- For web + a real tenant: the same details `demo-app` needs (host, client ID,
  redirect URI, an agent account)

## Running

```bash
cd demo-react-native
npm install
```

Then pick a target:

```bash
npm run web       # browser on http://localhost:3000 — uses the REAL SDK
npm run android   # Android emulator/device — real tenant via bridge
npm run ios       # iOS device — real tenant via bridge (macOS only for Simulator)
npm start         # dev server; press w / a / i to choose
```

For a production build served the same way `demo-app` serves its own:

```bash
npm run build:web   # expo export --platform web  ->  dist/
npm run serve       # http-server on http://localhost:3000 with SPA fallback
```

### On web (real SDK)

The web target is pinned to **port 3000** (Expo's default is 8081) so the origin
matches the `http://localhost:3000` redirect URI registered on the OAuth client.
Note this is the same port `demo-app` uses — run one or the other, not both.

Fill in the Settings form exactly as in `demo-app`:

| Field | Value |
| --- | --- |
| Avaya Infinity Host | `api.avayacloud.com` or `https://api.avayacloud.com` — both work, the SDK prefixes `https://` if missing |
| Client ID | from the SDK integration in the Avaya Infinity admin console |
| Redirect URI | pre-filled with `window.location.origin`, i.e. `http://localhost:3000` |
| OAuth Mode | Redirect (default) or Popup — in Popup mode the app appends `/callback.html` itself, so enter the origin only |
| IdP Hint | optional, e.g. `entra-id` |

The redirect URI must be pre-registered on the OAuth client: `http://localhost:3000`
for redirect mode, `http://localhost:3000/callback.html` for popup mode.

Popup mode is supported — [`public/callback.html`](public/callback.html) forwards the
authorization code to the opener via `postMessage` and closes itself. Expo serves
`public/` at the web root in dev and copies it into `dist/` on export, so the page is
reachable at the registered URI either way.

### On iOS / Android (real tenant, via the bridge)

Native needs the web build reachable over **HTTPS**, because the WebView loads the
bridge from there and OAuth redirects back to it. OAuth only exempts
`http://localhost` from the HTTPS rule, and on a device `localhost` is the phone —
so a LAN address like `http://192.168.1.38:3000` will be rejected by the IdP.

**1. Expose the web build over HTTPS.** Either deploy `dist/` to any static host, or
tunnel the dev server while iterating:

```bash
npm run web                                   # localhost:3000
ngrok http 3000 --domain=your-name.ngrok-free.app
```

Claim a static ngrok domain (free tier includes one) — otherwise the URL changes on
every restart and must be re-registered each time.

**2. Register that origin** as a redirect URI on the OAuth client, exactly as you did
for `http://localhost:3000`.

**3. In the app's Settings**, set **Redirect URI** to that HTTPS origin. It doubles as
the bridge origin: the WebView loads `<origin>/?bridge=1`.

Then sign in with the real agent account. Everything after that — CX login, queues,
interactions, call controls — is live tenant data.

If the origin is unreachable or unregistered, you get a real error on the Settings
screen. Nothing falls back to sample data.

#### Known limitations of the bridge

- **Backgrounding drops calls.** iOS suspends WebView JavaScript when the app is
  backgrounded or the screen locks. Surviving that needs CallKit (iOS) and
  ConnectionService + a foreground service (Android).
- **No incoming-call push.** Ringing requires the app to be open. Real shift usage
  needs VoIP push (APNs) / FCM.
- Both of those need a custom dev build (`expo-dev-client` + EAS), not Expo Go.
- **Viewer objects are not yet proxied** — `getViewers()` returns empty on native;
  the supervisor strip is driven by events instead.

## What is ported

Everything in `demo-app` that isn't inherently a browser affordance:

- **Auth flow** — the same state machine, including the OAuth subtleties: redirect mode
  re-calls `init()` on every page load (the first call never resolves), while popup mode
  deliberately does *not* auto-init because `window.open()` outside a user gesture is
  blocked
- **Interactions** — list, ringing/accepting cards, call controls, DTMF, hold/mute,
  wrap-up with countdown + extension, resolve/unresolve, transfers (blind, attended,
  consult), messages with optimistic send, customer record, classification, notes
- **Queues** — stats, search, per-queue login/logout with required reason codes
- **Profile** — CX login/logout, status and reason codes, sign out
- **Infrastructure** — notifications, connection indicators, logging, `safeUnsubscribe`
- **Strings** — [`src/locales/en.ts`](src/locales/en.ts) is copied verbatim from `demo-app`

Capability guards (`canHold()`, `canWrapUp()`, …) are read from the interaction itself
rather than re-derived, so the SDK stays the single source of truth on every platform.

## Deliberate platform adaptations

A phone is not a 3-pane desktop. These are the places the port diverges, and why:

| demo-app | here | why |
| --- | --- | --- |
| Left icon rail | bottom tab bar | platform-correct navigation on phones |
| 3-pane layout (list / detail / right panel) | master-detail; detail has Details / Messages / Transfers tabs | no room for three columns |
| Radix dropdowns & popovers | modal sheets | avoids overlay clipping inside scroll containers; larger tap targets |
| Header CX popover + avatar dropdown | one profile sheet | a phone header fits neither |
| Floating DTMF popover | modal keypad | comfortable digit tap size |
| Tailwind classes | [`src/theme.ts`](src/theme.ts) tokens | RN has no Tailwind; the hex values are copied so both apps look like one product |
| HTML `<table>` for queues | stacked rows | a 3-column table does not survive phone widths |
| Scroll-anchored message feed | inverted `FlatList` | pins to newest without manual scroll management |

## Project layout

```
src/
  App.tsx                  auth state machine (mirrors demo-app/src/App.tsx)
  Settings.tsx             SDK configuration form
  Agent.tsx                authenticated shell
  theme.ts                 design tokens ported from demo-app's Tailwind palette
  sdk/
    types.ts               portable mirror of the SDK's public API  ← start here
    adapter.web.ts         real SDK, directly in the page
    adapter.native.ts      real SDK, via the WebView bridge
    adapter.ts             default for TypeScript / non-RN tooling
    customer.ts            customer edits across both adapters
    sdk-manager.ts         idempotent init (ported from demo-app)
    config-storage.ts      non-secret config persistence
    bridge/
      protocol.ts          wire format: requests, events, snapshots
      bridge-host.web.ts   runs INSIDE the WebView, drives the real SDK
      bridge-client.ts     native half: correlation, events, proxy objects
      BridgeWebView.tsx    mounts the hidden WebView (null on web)
  components/
    ui/                    Button, Badge, Card, TextField, Dialog, Select, Avatar
    layout/                header, logo, connection indicators, MainLayout
    interactions/          list, cards, call controls, panels, messages, transfers
    queues/                stats, search, table
    UserProfile/           profile chip and sheet
    shared/                logout reason dialog
    notifications/         provider + toast center
  hooks/                   useUserStatus, useCxLogin
  utils/                   logger, formatting, reason-code helpers
  locales/en.ts            copied verbatim from demo-app
  navigation/RootTabs.tsx  bottom tabs
```

## Replacing the bridge later

Nothing in `src/components` imports the SDK directly — everything goes through
`@/sdk`. The bridge is just one implementation of `AgentSdkFacade`
([`src/sdk/types.ts`](src/sdk/types.ts)), so it can be swapped without touching a
single screen:

- **An official React Native build from Avaya** — if one ships, point
  `adapter.native.ts` at it and delete the bridge. This removes the backgrounding
  and push limitations in one step.
- **`react-native-webrtc` + a native SIP stack** — most work, and it means
  reimplementing the SDK's signalling rather than using it. Only worth it if the
  bridge proves insufficient and no official build appears.

## Verifying a change

```bash
npx tsc --noEmit                  # type-check
npx expo export --platform web
npx expo export --platform android
npx expo export --platform ios
```

All four currently pass.
