/**
 * Web build of BridgeWebView — renders nothing.
 *
 * On web the SDK runs directly in the page (see `adapter.web.ts`), so there is no
 * bridge and no WebView. This stub exists so `App.tsx` can reference the component
 * unconditionally without pulling `react-native-webview` into the web bundle.
 */
export function BridgeWebView(_props: { origin: string }) {
  return null;
}
