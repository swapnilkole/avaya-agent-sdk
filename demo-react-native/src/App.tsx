import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  LogLevel,
  OAuthMode,
  SdkEventType,
  SdkManager,
  UserEventType,
  agentSdk,
  type SdkInitializationFailedEvent,
  type SessionDestroyedEvent,
  type User,
} from '@/sdk';
import { clearConfig, loadConfig, saveConfig, type Config } from '@/sdk/config-storage';
import { BridgeWebView } from '@/sdk/bridge/BridgeWebView';
import Agent from '@/Agent';
import Settings from '@/Settings';
import { BridgeHostScreen } from '@/components/BridgeHostScreen';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { strings } from '@/locales/en';
import { colors, fontSize, spacing } from '@/theme';
import { createLogger, getErrorDetails } from '@/utils/logger';

const logger = createLogger('App');

/**
 * App — entry point and auth state machine.
 *
 * Ported from demo-app/src/App.tsx. The flow is unchanged:
 *   1. Settings collects host / clientId / redirect URI / OAuth mode
 *   2. SdkManager.initialize() authenticates (OAuth in the page on web, OAuth
 *      inside the bridge WebView on native)
 *   3. On success the Agent shell renders
 *
 * The web-specific OAuth bootstrap is preserved: in redirect mode `init()` must be
 * called on every page load because the first call never resolves — it navigates to
 * the IdP and the authorization code comes back in the URL. In popup mode it must
 * NOT auto-run, because `window.open()` outside a user gesture is blocked; the
 * Settings button supplies that gesture. On native neither applies, so a saved
 * config simply reconnects.
 */
function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [savedConfig, setSavedConfig] = useState<Config | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const initSdk = useCallback(async (config: Config) => {
    try {
      logger.info('SDK initialization started');
      setError(null);
      setIsInitializing(true);

      const oAuthMode = config.oAuthMode ?? OAuthMode.REDIRECT;
      const userInstance = await SdkManager.initialize({
        avayaInfinityHost: config.avayaInfinityHost,
        clientId: config.clientId,
        // Popup mode serves the callback page from the app origin.
        oAuthRedirectUri:
          oAuthMode === OAuthMode.POPUP ? `${config.redirectUri}/callback.html` : config.redirectUri,
        oAuthMode,
        ...(config.idpHint ? { idpHint: config.idpHint } : {}),
        logLevel: LogLevel.DEBUG,
      });

      setUser(userInstance);
      setAuthenticated(true);
      logger.info('SDK initialization completed');

      // Clean the authorization code out of the URL after a web redirect.
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      logger.error('SDK initialization failed', getErrorDetails(err));
      setError(err instanceof Error ? err.message : strings.common.error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // One-time bootstrap. On web this also resumes an in-flight OAuth redirect.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const config = await loadConfig();
      if (cancelled) return;

      setSavedConfig(config);
      setBootstrapped(true);

      if (!config) {
        // A redirect came back but no config was stored — nothing to resume with.
        if (isOAuthRedirect()) setError(strings.settings.configNotFound);
        return;
      }

      const popupMode = (config.oAuthMode ?? OAuthMode.REDIRECT) === OAuthMode.POPUP;
      if (Platform.OS !== 'web' || isOAuthRedirect() || !popupMode) {
        void initSdk(config);
      }
      // Popup mode with no redirect in progress falls through to Settings, whose
      // submit button provides the required user gesture.
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Intentionally one-shot: initSdk clears `code`/`error` from the URL, and
    // re-running this would restart init() and could loop on an OAuth error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SDK lifecycle events that end the session.
  useEffect(() => {
    const sessionDestroyedId = agentSdk.subscribe(
      SdkEventType.SESSION_DESTROYED,
      (event: SessionDestroyedEvent) => {
        logger.info('Session destroyed');
        setAuthenticated(false);
        setUser(null);
        setError(
          `Your session was terminated by the server. Error: ${event.payload?.errorMessage ?? ''}`,
        );
        SdkManager.reset();
      },
    );

    const tokenRefreshFailedId = agentSdk.subscribe(
      SdkEventType.TOKEN_REFRESH_FAILED,
      (event: SessionDestroyedEvent) => {
        logger.error('Token refresh failed');
        setAuthenticated(false);
        setUser(null);
        setError(
          `Your session has expired. Please sign in again. Error: ${event.payload?.errorMessage ?? ''}`,
        );
        SdkManager.reset();
      },
    );

    const initFailedId = agentSdk.subscribe(
      SdkEventType.INITIALIZATION_FAILED,
      (event: SdkInitializationFailedEvent) => {
        logger.error('SDK initialization failed event', getErrorDetails(event.payload.error));
        setError(`Initialization failed: ${event.payload.error.message}`);
        setIsInitializing(false);
        SdkManager.reset();
      },
    );

    return () => {
      agentSdk.unsubscribe(SdkEventType.SESSION_DESTROYED, sessionDestroyedId);
      agentSdk.unsubscribe(SdkEventType.TOKEN_REFRESH_FAILED, tokenRefreshFailedId);
      agentSdk.unsubscribe(SdkEventType.INITIALIZATION_FAILED, initFailedId);
    };
  }, []);

  // USER_LOGOUT is a user-scoped event, so it can only be wired once a user exists.
  useEffect(() => {
    if (!user) return undefined;

    const handlerId = user.subscribe(UserEventType.USER_LOGOUT, () => {
      logger.info('User logged out');
      setAuthenticated(false);
      setUser(null);
      setError('You have been logged out.');
      SdkManager.reset();
    });

    return () => {
      try {
        user.unsubscribe(UserEventType.USER_LOGOUT, handlerId);
      } catch {
        // The SDK may already be torn down; teardown must not throw.
      }
    };
  }, [user]);

  const handleSettingsSubmit = (config: Config) => {
    if (!config.avayaInfinityHost || !config.clientId) {
      setError(strings.settings.fillAllFields);
      return;
    }

    // Persist NON-SECRET config only so it survives an OAuth round-trip or app
    // restart. Tokens stay in SDK memory — see src/sdk/config-storage.ts.
    void saveConfig(config);
    setSavedConfig(config);
    void initSdk(config);
  };

  const handleSignOut = () => {
    logger.info('Logout requested');
    void SdkManager.destroy()
      .then(() => logger.info('SDK destroy completed'))
      .catch((destroyError: unknown) =>
        logger.error('SDK destroy failed', getErrorDetails(destroyError)),
      );
    void clearConfig();
    setUser(null);
    setAuthenticated(false);
    setError(null);
  };

  const renderBody = () => {
    // Waiting on storage, or authenticating.
    if (!bootstrapped || (isInitializing && !authenticated && !error)) {
      return (
        <View style={styles.centered} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={colors.blue600} />
          <Text style={styles.loadingText}>{strings.common.authenticating}</Text>
        </View>
      );
    }

    if (authenticated && user) {
      return <Agent user={user} onSignOut={handleSignOut} />;
    }

    return (
      <Settings
        onSubmit={handleSettingsSubmit}
        error={error}
        submitting={isInitializing}
        initialConfig={savedConfig}
      />
    );
  };

  // Bridge mode: the native app's hidden WebView opens this page with ?bridge=1.
  // It runs the SDK headlessly instead of rendering the agent UI.
  if (isBridgeMode()) {
    return <BridgeHostScreen />;
  }

  // On native, the SDK lives inside this WebView. It must be mounted before
  // init() is called and stay mounted for the whole session — it owns the
  // WebRTC connection and the call audio element.
  const bridgeOrigin = Platform.OS === 'web' ? null : savedConfig?.redirectUri?.trim() || null;

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        {bridgeOrigin ? <BridgeWebView origin={bridgeOrigin} /> : null}
        {renderBody()}
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

/** True when the page was opened as the SDK bridge host (web only). */
function isBridgeMode(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('bridge') === '1';
}

/** True when the current web URL carries an OAuth authorization code or error. */
function isOAuthRedirect(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error');
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.gray50,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.gray500,
  },
});

export default App;
