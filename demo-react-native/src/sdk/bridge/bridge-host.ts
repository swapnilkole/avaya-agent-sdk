/**
 * Native-side placeholder for the bridge host.
 *
 * The real implementation is `bridge-host.web.ts`, which Metro selects when
 * bundling for web. This file exists so TypeScript and the native bundler can
 * resolve `./bridge-host` without pulling the browser-only SDK into a native
 * bundle — importing it there would crash at module evaluation.
 *
 * Nothing on native should ever call this: the native side *hosts* the WebView
 * that runs the real host, it does not run one itself.
 */

export function startBridgeHost(): void {
  throw new Error(
    'startBridgeHost() is web-only. Native hosts the bridge in a WebView instead.',
  );
}
