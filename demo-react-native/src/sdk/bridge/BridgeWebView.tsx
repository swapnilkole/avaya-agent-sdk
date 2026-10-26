import { useEffect, useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  WebView as RNWebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';

import { createLogger } from '@/utils/logger';

import { bridge } from './bridge-client';

const logger = createLogger('BridgeWebView');

/**
 * react-native-webview@14 types its class component in a way React 19's JSX
 * resolver reduces to `never`, so every prop errors. Re-typing it here keeps full
 * prop type-checking (it is still `WebViewProps`) without disabling the checker.
 */
const WebView = RNWebView as unknown as ForwardRefExoticComponent<
  WebViewProps & RefAttributes<RNWebView>
>;

interface BridgeWebViewProps {
  /**
   * HTTPS origin hosting the web build, e.g. https://your-app.ngrok-free.app.
   * The bridge page is loaded from `${origin}/?bridge=1`, and this same origin
   * must be registered as an OAuth redirect URI — the IdP redirects back here.
   */
  origin: string;
}

/**
 * Hosts the hidden WebView that runs the real SDK.
 *
 * It is rendered at 1x1 and effectively invisible rather than unmounted, because
 * the WebView owns the WebRTC peer connection and the audio element for live
 * calls — unmounting it drops the call. `onShouldStartLoadWithRequest` lets the
 * OAuth navigation to the IdP and back proceed inside this same WebView.
 *
 * Mic permission: Android needs `onPermissionRequest` granted, which
 * react-native-webview exposes through `mediaCapturePermissionGrantType`.
 */
export function BridgeWebView({ origin }: BridgeWebViewProps) {
  const ref = useRef<RNWebView>(null);

  useEffect(() => {
    bridge.attach((message: string) => {
      // postMessage into the page; the host listens on window/document 'message'.
      ref.current?.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(message)} })); true;`,
      );
    });
    return () => bridge.detach();
  }, []);

  const uri = `${origin.replace(/\/+$/, '')}/?bridge=1`;

  const source = {
    uri,
    headers: {
      // ngrok's free tier serves an interstitial warning page on first visit.
      // It returns HTTP 200, so onError never fires — the WebView simply loads a
      // page with no bridge host and `ready` never arrives. This header opts out.
      'ngrok-skip-browser-warning': 'true',
    },
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    bridge.handleMessage(event.nativeEvent.data);
  };

  const handleError: NonNullable<WebViewProps['onError']> = (event) => {
    const { description } = event.nativeEvent;
    logger.error('Bridge WebView failed to load', { description: String(description) });
    bridge.reportLoadFailure(
      `Could not load the SDK bridge from ${origin}: ${String(description)}`,
    );
  };

  const handleHttpError: NonNullable<WebViewProps['onHttpError']> = (event) => {
    const { statusCode } = event.nativeEvent;
    logger.error('Bridge WebView HTTP error', { statusCode });
    bridge.reportLoadFailure(`The SDK bridge origin ${origin} returned HTTP ${statusCode}.`);
  };

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        ref={ref}
        source={source}
        onMessage={handleMessage}
        originWhitelist={['https://*', 'http://localhost*']}
        javaScriptEnabled
        domStorageEnabled
        // Call audio must start without a tap, since the agent accepts from native UI.
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        // Grants getUserMedia without a second native prompt once the OS
        // permission is held; the OS prompt still governs real access.
        mediaCapturePermissionGrantType="grant"
        onError={handleError}
        onHttpError={handleHttpError}
        // Load progress is the only way to tell "never reached the origin" apart
        // from "loaded something, but it wasn't our bridge page".
        onLoadStart={() => logger.info('Bridge WebView load started', { uri })}
        onLoadEnd={() => {
          logger.info('Bridge WebView load finished', { uri });
          bridge.noteDocumentLoaded();
        }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Kept on-screen but imperceptible: a display:none WebView is suspended on
  // some platforms, which would kill call audio.
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
    zIndex: -1,
  },
  webview: {
    width: 1,
    height: 1,
  },
});
