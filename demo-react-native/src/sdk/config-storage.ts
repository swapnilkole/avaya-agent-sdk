import AsyncStorage from '@react-native-async-storage/async-storage';

import { OAuthMode } from './types';

const STORAGE_KEY = 'sdkConfig';

export interface Config {
  avayaInfinityHost: string;
  clientId: string;
  oAuthMode: OAuthMode;
  redirectUri: string;
  idpHint?: string;
}

/**
 * Persisted SDK configuration.
 *
 * SECURITY: this stores NON-SECRET configuration only — host, client ID, OAuth mode.
 * Tokens and refresh tokens never go here. AsyncStorage is unencrypted on-device
 * storage readable by anything running in the app's sandbox, exactly as
 * `sessionStorage` is readable by any script on the web origin. The SDK keeps all
 * auth material in memory, and this app must not undo that.
 */
export async function loadConfig(): Promise<Config | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Config) : null;
  } catch {
    // Unreadable or corrupt storage is equivalent to "no saved config" — the user
    // simply re-enters it rather than the app failing to start.
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Persistence is a convenience; a failure here must not block sign-in.
  }
}

export async function clearConfig(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}
