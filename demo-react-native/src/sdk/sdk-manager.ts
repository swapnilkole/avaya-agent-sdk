import { createLogger } from '@/utils/logger';

import { agentSdk } from './adapter';
import type { AgentSdkInitParams, User } from './types';

const logger = createLogger('SdkManager');

/**
 * SDK Manager - Ensures SDK initialization happens only once.
 * Handles idempotency so React components can call initialize() freely.
 *
 * Ported from demo-app/src/sdk-manager.ts; the only change is that it drives the
 * platform adapter rather than importing the SDK directly.
 */
class SdkManager {
  private static initPromise: Promise<User> | null = null;
  private static isInitialized = false;

  /**
   * Initialize the SDK (idempotent - safe to call multiple times).
   * Returns immediately if already initialized or in progress.
   */
  static async initialize(config: AgentSdkInitParams): Promise<User> {
    if (this.initPromise) {
      logger.debug('SDK initialization promise reused');
      return this.initPromise;
    }

    this.initPromise = agentSdk
      .init(config)
      .then((user: User) => {
        this.isInitialized = true;
        return user;
      })
      .catch((error) => {
        // Reset on error so initialization can be retried.
        this.initPromise = null;
        throw error;
      });

    return this.initPromise;
  }

  static getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /** Reset initialization state (used on logout / session loss). */
  static reset(): void {
    logger.debug('SDK manager state reset');
    this.initPromise = null;
    this.isInitialized = false;
  }

  static async destroy(): Promise<void> {
    await agentSdk.destroy();
    this.initPromise = null;
    this.isInitialized = false;
  }
}

export default SdkManager;
