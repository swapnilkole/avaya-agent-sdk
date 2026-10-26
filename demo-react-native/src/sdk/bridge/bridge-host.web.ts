/**
 * Bridge host — runs INSIDE the WebView, drives the real SDK.
 *
 * This module is web-only. It is reached by loading the web build with `?bridge=1`,
 * which makes `App.tsx` render the headless host instead of the UI. Reusing the web
 * bundle means the SDK is already bundled and resolved correctly — no second build
 * pipeline, and the bridge can never drift from the version the web app uses.
 *
 * Responsibilities:
 *  - accept requests from native, invoke the matching SDK method, reply
 *  - keep a registry of live SDK objects addressed by handle
 *  - snapshot object state (props + capability predicates) into plain JSON
 *  - subscribe to every SDK event and stream it north with a fresh snapshot
 *
 * There is no fallback data here. Every failure is reported as a real error.
 */

import {
  AvayaInfinityAgentSdk,
  AvayaInfinityAgentSdkError,
  InteractionEventType,
  QueueEventType,
  SdkEventType,
  UserEventType,
  WebSocketConnectionEventType,
} from '@avaya/infinity-agent-sdk';

import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeOutbound,
  type BridgeRequest,
  type Snapshot,
  type TargetHandle,
} from './protocol';

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

interface ReactNativeWebViewBridge {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebViewBridge;
  }
}

function send(message: BridgeOutbound): void {
  const serialised = JSON.stringify(message);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(serialised);
    return;
  }
  // Fallback so the bridge can be exercised in an iframe during development.
  window.parent?.postMessage(serialised, '*');
}

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
  send({ kind: 'log', level, message });
}

function describeError(error: unknown): { message: string; code?: string; detail?: string } {
  if (AvayaInfinityAgentSdkError.is(error)) {
    return {
      message: error.message,
      code: error.code,
      detail: (error as { detail?: string }).detail,
    };
  }
  if (error instanceof Error) return { message: error.message };
  return { message: String(error) };
}

/* -------------------------------------------------------------------------- */
/* Object registry                                                             */
/* -------------------------------------------------------------------------- */

/** Live SDK objects, addressed by the handle native uses to refer to them. */
const registry = new Map<TargetHandle, unknown>();

/** Handles already wired for event forwarding, so we subscribe exactly once. */
const subscribed = new Set<TargetHandle>();

function interactionHandle(interaction: { interactionId: string }): TargetHandle {
  return `interaction:${interaction.interactionId}`;
}

function queueHandle(queue: { queueId: string }): TargetHandle {
  return `queue:${queue.queueId}`;
}

/* -------------------------------------------------------------------------- */
/* Snapshots                                                                   */
/* -------------------------------------------------------------------------- */

/** Reads a getter defensively — the SDK throws on some fields when torn down. */
function read(source: Record<string, unknown>, key: string): unknown {
  try {
    const value = source[key];
    return value instanceof Date ? value.toISOString() : value;
  } catch {
    return undefined;
  }
}

/** Invokes a `can*()` predicate defensively; an unavailable capability reads false. */
function readCap(source: Record<string, unknown>, key: string): boolean {
  try {
    const fn = source[key];
    return typeof fn === 'function' ? Boolean((fn as () => boolean).call(source)) : false;
  } catch {
    return false;
  }
}

function snapshot(
  handle: TargetHandle,
  target: unknown,
  propKeys: string[],
  capKeys: string[],
): Snapshot {
  const source = target as Record<string, unknown>;
  const props: Record<string, unknown> = {};
  const caps: Record<string, boolean> = {};

  for (const key of propKeys) props[key] = read(source, key);
  for (const key of capKeys) caps[key] = readCap(source, key);

  return { handle, props, caps };
}

const USER_PROPS = [
  'userId',
  'userFullName',
  'email',
  'isLoggedInToCx',
  'isEliteVoiceEnabled',
  'canCreateOutboundVoiceInteraction',
  'currentStatus',
];

const INTERACTION_PROPS = [
  'interactionId',
  'communicationType',
  'currentStatus',
  'customer',
  'queueDetails',
  'startTime',
  'isElite',
  'isOwner',
  'isMuted',
  'isHold',
  'notes',
  'subject',
  'wrapUpDeadline',
  'transferDetails',
  'ownerDetails',
  'customFields',
  'classificationType',
  'classificationResult',
];

const INTERACTION_CAPS = [
  'isViewer',
  'canAccept',
  'canReject',
  'canHold',
  'canResume',
  'canMute',
  'canUnmute',
  'canDisconnectCall',
  'canResolve',
  'canUnresolve',
  'canWrapUp',
  'canExtendWrapUp',
  'canSendDtmf',
  'canTransfer',
  'canBlindTransfer',
  'canAttendedTransfer',
  'canCancelTransfer',
  'canSendMessage',
  'canSetNotes',
  'canSetSubject',
  'canLeave',
];

const QUEUE_PROPS = ['queueId', 'queueName', 'queueType', 'isLoggedIn', 'loggedInAt'];

function snapshotUser(user: unknown): Snapshot {
  return snapshot('user', user, USER_PROPS, []);
}

function snapshotInteraction(interaction: unknown): Snapshot {
  const handle = interactionHandle(interaction as { interactionId: string });
  return snapshot(handle, interaction, INTERACTION_PROPS, INTERACTION_CAPS);
}

function snapshotQueue(queue: unknown): Snapshot {
  const handle = queueHandle(queue as { queueId: string });
  return snapshot(handle, queue, QUEUE_PROPS, []);
}

/**
 * Converts whatever an SDK method returned into something JSON-safe.
 * Live objects become snapshots and are registered so native can address them later.
 */
function serialiseResult(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serialiseResult);

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.interactionId === 'string' && typeof candidate.accept === 'function') {
    registerInteraction(value);
    return snapshotInteraction(value);
  }
  if (typeof candidate.queueId === 'string' && typeof candidate.login === 'function') {
    registerQueue(value);
    return snapshotQueue(value);
  }
  if (value instanceof Date) return value.toISOString();

  // Plain data (reason codes, classification codes, messages, …) passes through.
  return value;
}

/* -------------------------------------------------------------------------- */
/* Event forwarding                                                            */
/* -------------------------------------------------------------------------- */

function forward(target: TargetHandle, event: string, payload?: unknown): void {
  send({ kind: 'evt', target, event, payload });
}

function registerInteraction(interaction: unknown): void {
  const handle = interactionHandle(interaction as { interactionId: string });
  registry.set(handle, interaction);
  if (subscribed.has(handle)) return;
  subscribed.add(handle);

  const subject = interaction as {
    subscribe: (event: string, handler: (e: unknown) => void) => string;
  };

  for (const event of Object.values(InteractionEventType)) {
    try {
      subject.subscribe(event, (raw) => {
        // Re-snapshot on every event: SDK objects mutate in place, so the
        // snapshot is the only way native sees the new state.
        forward(handle, event, {
          snapshot: snapshotInteraction(interaction),
          payload: serialiseEventPayload(raw),
        });
      });
    } catch (error) {
      log('warn', `interaction subscribe failed for ${event}: ${describeError(error).message}`);
    }
  }
}

function registerQueue(queue: unknown): void {
  const handle = queueHandle(queue as { queueId: string });
  registry.set(handle, queue);
  if (subscribed.has(handle)) return;
  subscribed.add(handle);

  const subject = queue as {
    subscribe: (event: string, handler: (e: unknown) => void) => string;
  };

  try {
    subject.subscribe(QueueEventType.QUEUE_STATUS_CHANGED, () => {
      forward(handle, QueueEventType.QUEUE_STATUS_CHANGED, { snapshot: snapshotQueue(queue) });
    });
  } catch (error) {
    log('warn', `queue subscribe failed: ${describeError(error).message}`);
  }
}

/** Strips live objects out of an event payload, registering any it carries. */
function serialiseEventPayload(raw: unknown): unknown {
  const event = raw as { payload?: Record<string, unknown> };
  const payload = event?.payload;
  if (!payload || typeof payload !== 'object') return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === 'object') {
      const candidate = value as Record<string, unknown>;
      if (typeof candidate.interactionId === 'string' && typeof candidate.accept === 'function') {
        registerInteraction(value);
        out[key] = snapshotInteraction(value);
        continue;
      }
      if (typeof candidate.queueId === 'string' && typeof candidate.login === 'function') {
        registerQueue(value);
        out[key] = snapshotQueue(value);
        continue;
      }
    }
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

function registerUser(user: unknown): void {
  registry.set('user', user);
  if (subscribed.has('user')) return;
  subscribed.add('user');

  const subject = user as {
    subscribe: (event: string, handler: (e: unknown) => void) => string;
  };

  for (const event of Object.values(UserEventType)) {
    try {
      subject.subscribe(event, (raw) => {
        forward('user', event, {
          snapshot: snapshotUser(user),
          payload: serialiseEventPayload(raw),
        });
      });
    } catch (error) {
      log('warn', `user subscribe failed for ${event}: ${describeError(error).message}`);
    }
  }
}

function subscribeSdkEvents(): void {
  const lifecycle = [...Object.values(SdkEventType), ...Object.values(WebSocketConnectionEventType)];
  for (const event of lifecycle) {
    try {
      AvayaInfinityAgentSdk.subscribe(event as never, ((raw: unknown) => {
        forward('sdk', event, { payload: serialiseEventPayload(raw) });
      }) as never);
    } catch (error) {
      log('warn', `sdk subscribe failed for ${event}: ${describeError(error).message}`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Request dispatch                                                            */
/* -------------------------------------------------------------------------- */

async function dispatch(request: BridgeRequest): Promise<unknown> {
  const { target, method, args = [] } = request;

  if (target === 'sdk') {
    switch (method) {
      case 'init': {
        const user = await AvayaInfinityAgentSdk.init(args[0] as never);
        registerUser(user);
        // Strip the authorization code so a reload cannot replay it.
        window.history.replaceState({}, document.title, window.location.pathname + '?bridge=1');
        return snapshotUser(user);
      }
      case 'destroy':
        await AvayaInfinityAgentSdk.destroy();
        registry.clear();
        subscribed.clear();
        return null;
      case 'sdkState':
        return AvayaInfinityAgentSdk.sdkState;
      default:
        throw new Error(`Unknown sdk method: ${method}`);
    }
  }

  const instance = registry.get(target);
  if (!instance) {
    throw new Error(`No live object for handle ${target}. It may have been torn down.`);
  }

  /**
   * Customer edits. The SDK exposes setters on `interaction.customer`, but that
   * object cannot cross the bridge as a live reference — native only ever sees a
   * snapshot of it. So native sends the whole patch and the setters are applied
   * here, where the real customer object lives.
   */
  if (method === '__updateCustomer') {
    const patch = (args[0] ?? {}) as Record<string, string>;
    const customer = (instance as { customer?: Record<string, unknown> }).customer;
    const setterFor: Record<string, string> = {
      name: 'setName',
      phone: 'setPhone',
      email: 'setEmail',
      languageCode: 'setLanguageCode',
    };

    for (const [field, value] of Object.entries(patch)) {
      const setterName = setterFor[field];
      const setter = setterName ? customer?.[setterName] : undefined;
      if (typeof setter !== 'function') {
        throw new Error(`Customer field "${field}" is not editable on this interaction`);
      }
      await (setter as (v: string) => Promise<void>).call(customer, value);
    }
    return snapshotInteraction(instance);
  }

  // Snapshot refresh is a bridge-level concern, not an SDK method.
  if (method === '__snapshot') {
    if (target === 'user') return snapshotUser(instance);
    if (target.startsWith('interaction:')) return snapshotInteraction(instance);
    if (target.startsWith('queue:')) return snapshotQueue(instance);
    throw new Error(`Cannot snapshot ${target}`);
  }

  const source = instance as Record<string, unknown>;
  const fn = source[method];
  if (typeof fn !== 'function') {
    throw new Error(`${target} has no method ${method}`);
  }

  const result = await (fn as (...a: unknown[]) => unknown).apply(instance, args);

  // Methods that hand back live objects must register them before serialising.
  if (method === 'getAssignedQueues') {
    (result as unknown[])?.forEach(registerQueue);
  }
  if (method === 'getAssignedInteractions') {
    (result as unknown[])?.forEach(registerInteraction);
  }

  return serialiseResult(result);
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

let started = false;

/** Boots the bridge host. Safe to call once; subsequent calls are ignored. */
export function startBridgeHost(): void {
  if (started) return;
  started = true;

  const handleMessage = (raw: string) => {
    let request: BridgeRequest;
    try {
      request = JSON.parse(raw) as BridgeRequest;
    } catch {
      return;
    }
    if (request?.kind !== 'req') return;

    dispatch(request)
      .then((result) => send({ kind: 'res', id: request.id, ok: true, result }))
      .catch((error) =>
        send({ kind: 'res', id: request.id, ok: false, error: describeError(error) }),
      );
  };

  // React Native injects messages as `message` events on both document and window,
  // depending on platform — listen on both and de-duplicate by request id upstream.
  window.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data === 'string') handleMessage(event.data);
  });
  document.addEventListener('message', ((event: MessageEvent) => {
    if (typeof event.data === 'string') handleMessage(event.data);
  }) as EventListener);

  subscribeSdkEvents();

  const params = new URLSearchParams(window.location.search);
  send({
    kind: 'ready',
    protocol: BRIDGE_PROTOCOL_VERSION,
    resumingOAuth: params.has('code') || params.has('error'),
  });
}
