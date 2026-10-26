import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OAuthMode, agentSdk } from '@/sdk';
import type { Config } from '@/sdk/config-storage';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AvayaLogo } from '@/components/layout/AvayaLogo';
import { strings } from '@/locales/en';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

interface SettingsProps {
  onSubmit: (config: Config) => void;
  error: string | null;
  submitting?: boolean;
  initialConfig?: Config | null;
}

/**
 * Settings — collects the configuration the SDK needs to initialise.
 *
 * Same fields as demo-app's settings form. On native a banner explains that the
 * session runs the SDK through a WebView bridge, so nobody is left wondering why their
 * real tenant's queues did not appear.
 */
export default function Settings({
  onSubmit,
  error,
  submitting = false,
  initialConfig,
}: SettingsProps) {
  const [formData, setFormData] = useState<Config>({
    avayaInfinityHost: initialConfig?.avayaInfinityHost ?? '',
    clientId: initialConfig?.clientId ?? '',
    oAuthMode: initialConfig?.oAuthMode ?? OAuthMode.REDIRECT,
    redirectUri: initialConfig?.redirectUri ?? defaultRedirectUri(),
    idpHint: initialConfig?.idpHint ?? '',
  });

  const update = <K extends keyof Config>(key: K, value: Config[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logoRow}>
              <AvayaLogo width={110} height={42} />
            </View>

            <Text style={styles.title}>{strings.settings.title}</Text>
            <Text style={styles.subtitle}>{strings.settings.subtitle}</Text>

            {Platform.OS !== 'web' && (
              <View style={styles.bridgeBanner}>
                <Text style={styles.bridgeTitle}>Bridge mode</Text>
                <Text style={styles.bridgeText}>
                  The Avaya SDK is browser-only, so this app runs it inside a hidden
                  WebView. Set Redirect URI to the HTTPS origin hosting the web build —
                  the same origin registered on your OAuth client.
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextField
              label={strings.settings.hostLabel}
              value={formData.avayaInfinityHost}
              onChangeText={(value) => update('avayaInfinityHost', value)}
              placeholder={strings.settings.hostPlaceholder}
              keyboardType="default"
            />

            <TextField
              label={strings.settings.clientIdLabel}
              value={formData.clientId}
              onChangeText={(value) => update('clientId', value)}
              placeholder={strings.settings.clientIdPlaceholder}
            />

            <TextField
              label={strings.settings.redirectUriLabel}
              value={formData.redirectUri}
              onChangeText={(value) => update('redirectUri', value)}
              placeholder={
                Platform.OS === 'web'
                  ? strings.settings.redirectUriPlaceholder
                  : 'https://your-app.ngrok-free.app'
              }
              hint={
                Platform.OS === 'web'
                  ? undefined
                  : 'HTTPS origin hosting the web build. Also used to load the SDK bridge.'
              }
            />

            {/* OAuth mode — radio pair, as on the web form. */}
            <Text style={styles.fieldLabel}>{strings.settings.oAuthModeLabel}</Text>
            <View style={styles.modeRow}>
              {[
                {
                  mode: OAuthMode.REDIRECT,
                  label: strings.settings.oAuthModeRedirect,
                  description: strings.settings.oAuthModeRedirectDescription,
                },
                {
                  mode: OAuthMode.POPUP,
                  label: strings.settings.oAuthModePopup,
                  description: strings.settings.oAuthModePopupDescription,
                },
              ].map((option) => {
                const selected = formData.oAuthMode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => update('oAuthMode', option.mode)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.modeOption, selected && styles.modeOptionSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <View style={styles.modeText}>
                      <Text style={styles.modeLabel}>{option.label}</Text>
                      <Text style={styles.modeDescription}>{option.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              label={strings.settings.idpHintLabel}
              value={formData.idpHint ?? ''}
              onChangeText={(value) => update('idpHint', value)}
              placeholder={strings.settings.idpHintPlaceholder}
              hint={strings.settings.idpHintDescription}
            />

            <Button onPress={() => onSubmit(formData)} loading={submitting}>
              {strings.settings.submitButton}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * On web the redirect URI must match the page origin that the OAuth client has
 * registered; on native there is no origin, so the field starts empty and is only
 * the origin the bridge WebView loads.
 */
function defaultRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.xl,
    ...shadow.sm,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.gray900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  bridgeBanner: {
    backgroundColor: colors.blue50,
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bridgeTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.blue800,
    marginBottom: 2,
  },
  bridgeText: {
    fontSize: fontSize.xs,
    color: colors.blue800,
    lineHeight: 17,
  },
  errorBox: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red200,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.red700,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  modeRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
  },
  modeOptionSelected: {
    borderColor: colors.blue600,
    backgroundColor: colors.blue50,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colors.blue600,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.blue600,
  },
  modeText: {
    flex: 1,
  },
  modeLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
  },
  modeDescription: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
});
