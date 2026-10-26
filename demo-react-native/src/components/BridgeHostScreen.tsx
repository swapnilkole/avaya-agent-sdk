import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { startBridgeHost } from '@/sdk/bridge/bridge-host';
import { colors, fontSize, spacing } from '@/theme';

/**
 * Headless bridge-mode screen.
 *
 * Rendered only on web, and only when the page is loaded with `?bridge=1` — which
 * is how the native app's hidden WebView opens it. It boots the bridge host and
 * then stays out of the way; the visible text exists purely so a human who opens
 * the URL directly understands what they are looking at.
 */
export function BridgeHostScreen() {
  useEffect(() => {
    startBridgeHost();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agent SDK bridge</Text>
      <Text style={styles.body}>
        This page hosts the Avaya Infinity Agent SDK for the mobile app. It is not
        meant to be used directly — open the app without <Text style={styles.code}>?bridge=1</Text>{' '}
        for the agent workspace.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray50,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  code: {
    fontWeight: '700',
    color: colors.gray900,
  },
});
