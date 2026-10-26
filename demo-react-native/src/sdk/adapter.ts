/**
 * Default adapter resolution.
 *
 * Metro prefers platform-specific siblings over this file:
 *   web           -> adapter.web.ts     (the real SDK, directly)
 *   ios / android -> adapter.native.ts  (the real SDK, via the WebView bridge)
 *
 * This module is therefore only reached by TypeScript, which has no notion of
 * platform extensions. It points at the bridge so type-checking sees the same
 * shape native does.
 */

import { bridgeAgentSdk } from './bridge/bridge-client';
import type { AgentSdkFacade } from './types';

export const agentSdk: AgentSdkFacade = bridgeAgentSdk;
