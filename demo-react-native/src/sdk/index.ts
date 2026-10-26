/**
 * Single import surface for everything SDK-related.
 *
 * UI code imports from `@/sdk` and never touches `@avaya/infinity-agent-sdk`
 * directly — that indirection is what lets the same screens run against the real
 * SDK directly on web and through the WebView bridge on iOS/Android.
 */

export * from './types';
export { agentSdk } from './adapter';
export { updateCustomerField } from './customer';
export { default as SdkManager } from './sdk-manager';
