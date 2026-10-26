/**
 * Native adapter (iOS / Android) — drives the REAL SDK through a WebView bridge.
 *
 * The SDK cannot be imported here: its bundle dereferences `document`,
 * `navigator.mediaDevices` and `RTCPeerConnection` at module scope, which throws
 * immediately under Hermes. So instead of importing it, native hosts a WebView
 * that loads the web build in bridge mode and talks to it over `postMessage`.
 *
 * There is deliberately NO simulator behind this. If the bridge origin is
 * unreachable, or the tenant rejects the configuration, the failure surfaces to
 * the user as a real error — the app never substitutes fabricated data.
 *
 * See `bridge/protocol.ts` for the wire format and `bridge/bridge-client.ts` for
 * the proxy objects that make remote SDK objects look local to the UI.
 */

import { bridgeAgentSdk } from './bridge/bridge-client';
import type { AgentSdkFacade } from './types';

export const agentSdk: AgentSdkFacade = bridgeAgentSdk;
