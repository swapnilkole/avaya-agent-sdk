/**
 * Web adapter — binds the UI to the REAL `@avaya/infinity-agent-sdk`.
 *
 * Expo Web runs in an actual browser, which is exactly the environment the SDK was
 * built for: DOM, WebRTC, `window.open`, web storage. So on web this app is a
 * fully functional agent desktop, feature-for-feature with the original demo-app —
 * real OAuth, real queues, real voice calls.
 *
 * Metro picks this file for `import ... from './adapter'` when bundling for web;
 * iOS/Android get `adapter.native.ts` instead and never load the SDK at all.
 *
 * The enum values in `./types` are copied verbatim from the SDK, so values pass
 * across this boundary unchanged. The casts below are nominal-typing bridges only —
 * no data is reshaped.
 */

import {
  AvayaInfinityAgentSdk,
  type AvayaInfinityAgentSdkInitParams,
} from '@avaya/infinity-agent-sdk';

import type {
  AgentSdkFacade,
  AgentSdkInitParams,
  EventHandler,
  SdkEventType,
  SdkState,
  User,
  WebSocketConnectionEventType,
} from './types';

class WebAgentSdk implements AgentSdkFacade {
  /** This adapter talks to a real Avaya Infinity tenant. */
  readonly isLive = true;

  get sdkState(): SdkState {
    return AvayaInfinityAgentSdk.sdkState as unknown as SdkState;
  }

  async init(params: AgentSdkInitParams): Promise<User> {
    const user = await AvayaInfinityAgentSdk.init(
      params as unknown as AvayaInfinityAgentSdkInitParams,
    );
    return user as unknown as User;
  }

  async destroy(): Promise<void> {
    await AvayaInfinityAgentSdk.destroy();
  }

  subscribe(event: SdkEventType | WebSocketConnectionEventType, handler: EventHandler): string {
    return AvayaInfinityAgentSdk.subscribe(event as never, handler as never);
  }

  unsubscribe(event: SdkEventType | WebSocketConnectionEventType, handlerId: string): void {
    AvayaInfinityAgentSdk.unsubscribe(event as never, handlerId);
  }
}

export const agentSdk: AgentSdkFacade = new WebAgentSdk();
