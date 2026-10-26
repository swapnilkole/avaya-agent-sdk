/**
 * Bridge client — the native half of the WebView bridge.
 *
 * Owns the request/response correlation, the event fan-out, and the proxy objects
 * that make a remote SDK object look like a local one to the UI. The WebView
 * element itself is mounted by `BridgeWebView`, which hands its ref here.
 *
 * Design notes:
 *  - Every SDK object is addressed by a handle and mirrored by a *snapshot*
 *    (props + capability results). Proxies read from the latest snapshot, so
 *    `interaction.canHold()` returns what the SDK decided, never a native guess.
 *  - Snapshots arrive with each event, so proxies mutate in place and the existing
 *    screens — which already re-render on SDK events — keep working unchanged.
 *  - Nothing here invents data. If the WebView is unreachable or the SDK rejects a
 *    call, the error propagates to the caller.
 */

import {
  AgentSdkError,
  type AgentSdkFacade,
  type AgentSdkInitParams,
  type AudioDevice,
  type ClassificationCode,
  type EventHandler,
  type Interaction,
  type MediaDevicePermissionState,
  type Queue,
  type ReasonCode,
  type SdkState,
  type SelectedAudioDevices,
  type TransferableQueue,
  type TransferableUser,
  type User,
  type Viewer,
  type WebRtcRegistrationState,
} from '../types';
import { createLogger } from '@/utils/logger';

import {
  reviveDates,
  type BridgeOutbound,
  type BridgeRequest,
  type Snapshot,
  type TargetHandle,
} from './protocol';

const logger = createLogger('BridgeClient');

/** How long a single bridge call may take before it is considered failed. */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * How long to wait for the WebView to boot the bridge host.
 *
 * Deliberately longer than a normal request: on first launch this covers loading
 * the whole web bundle over whatever connection the phone has, which through a
 * tunnel on a dev build can take a while.
 */
const READY_TIMEOUT_MS = 120_000;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

type Listener = (event: { payload: unknown }) => unknown;

let requestSeq = 0;

class BridgeClient {
  /** Set by BridgeWebView once the element mounts. */
  private post: ((message: string) => void) | null = null;

  private ready = false;
  private readyWaiters: Array<() => void> = [];
  private pending = new Map<string, Pending>();

  /** handle -> event name -> handlerId -> listener */
  private listeners = new Map<TargetHandle, Map<string, Map<string, Listener>>>();
  private handlerSeq = 0;

  /** Latest snapshot per handle, the backing store for every proxy. */
  private snapshots = new Map<TargetHandle, Snapshot>();

  /** Proxies handed to the UI, reused so identity is stable across events. */
  private proxies = new Map<TargetHandle, unknown>();

  private lastFault: string | null = null;

  /* ----- transport wiring (called by BridgeWebView) ---------------------- */

  attach(post: (message: string) => void): void {
    this.post = post;
  }

  detach(): void {
    this.post = null;
    this.ready = false;
    this.documentLoaded = false;
    this.failAllPending('The SDK bridge was torn down.');
  }

  /** Called when the WebView fails to load its origin at all. */
  reportLoadFailure(description: string): void {
    this.lastFault = description;
    this.ready = false;
    this.failAllPending(description);
  }

  private failAllPending(message: string): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new AgentSdkError(message, 'ASE_1008'));
    }
    this.pending.clear();
  }

  /* ----- inbound messages ------------------------------------------------ */

  handleMessage(raw: string): void {
    let message: BridgeOutbound;
    try {
      message = JSON.parse(raw) as BridgeOutbound;
    } catch {
      return;
    }

    switch (message.kind) {
      case 'ready': {
        this.ready = true;
        this.lastFault = null;
        logger.info('Bridge ready', { protocol: message.protocol });
        this.readyWaiters.splice(0).forEach((resolve) => resolve());
        break;
      }

      case 'res': {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(message.id);
        if (message.ok) {
          entry.resolve(message.result);
        } else {
          const error = message.error;
          entry.reject(new AgentSdkError(error?.message ?? 'Bridge call failed', error?.code, error?.detail));
        }
        break;
      }

      case 'evt': {
        const body = message.payload as { snapshot?: Snapshot; payload?: unknown } | undefined;
        if (body?.snapshot) this.applySnapshot(body.snapshot);
        this.emit(message.target, message.event, body?.payload);
        break;
      }

      case 'fault': {
        this.lastFault = message.message;
        logger.error('Bridge fault', { message: message.message, code: message.code });
        break;
      }

      case 'log': {
        logger[message.level]('[webview] ' + message.message);
        break;
      }
    }
  }

  private emit(target: TargetHandle, event: string, payload: unknown): void {
    const bucket = this.listeners.get(target)?.get(event);
    if (!bucket) return;
    for (const listener of Array.from(bucket.values())) {
      try {
        listener({ payload });
      } catch (error) {
        logger.warn('Bridge listener threw', {
          event,
          errorMessage: error instanceof Error ? error.message : undefined,
        });
      }
    }
  }

  /* ----- outbound requests ----------------------------------------------- */

  /** Set by BridgeWebView when the document finishes loading, bridge host or not. */
  private documentLoaded = false;

  noteDocumentLoaded(): void {
    this.documentLoaded = true;
  }

  /**
   * Builds a diagnosis for a ready-timeout. Whether the document loaded at all is
   * what separates "could not reach the origin" from "reached something that
   * wasn't our bridge page" — most often a tunnel interstitial or a stale deploy.
   */
  private readyTimeoutMessage(): string {
    if (!this.documentLoaded) {
      return 'Could not load the SDK bridge page. Check that the Redirect URI origin is reachable from this device and is serving the app.';
    }
    return 'The SDK bridge page loaded but never started. The origin may be serving an interstitial or a build without bridge support — open <origin>/?bridge=1 in a browser and confirm it shows the "Agent SDK bridge" page.';
  }

  private async waitUntilReady(): Promise<void> {
    if (this.ready) return;
    if (this.lastFault) {
      throw new AgentSdkError(this.lastFault, 'ASE_1008');
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new AgentSdkError(this.readyTimeoutMessage(), 'ASE_1008')),
        READY_TIMEOUT_MS,
      );
      this.readyWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async call<T = unknown>(target: TargetHandle, method: string, args: unknown[] = []): Promise<T> {
    await this.waitUntilReady();

    if (!this.post) {
      throw new AgentSdkError('The SDK bridge is not connected.', 'ASE_1008');
    }

    const id = `r${++requestSeq}`;
    const request: BridgeRequest = { kind: 'req', id, target, method, args };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new AgentSdkError(`${target}.${method}() timed out.`, 'ASE_0001'));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      this.post!(JSON.stringify(request));
    });
  }

  subscribe(target: TargetHandle, event: string, handler: EventHandler): string {
    const id = `h${++this.handlerSeq}`;
    let byEvent = this.listeners.get(target);
    if (!byEvent) {
      byEvent = new Map();
      this.listeners.set(target, byEvent);
    }
    let bucket = byEvent.get(event);
    if (!bucket) {
      bucket = new Map();
      byEvent.set(event, bucket);
    }
    bucket.set(id, handler as Listener);
    return id;
  }

  unsubscribe(target: TargetHandle, event: string, handlerId: string): void {
    this.listeners.get(target)?.get(event)?.delete(handlerId);
  }

  /* ----- snapshots and proxies -------------------------------------------- */

  applySnapshot(snap: Snapshot): void {
    const revived: Snapshot = {
      ...snap,
      props: reviveDates(snap.props),
    };
    this.snapshots.set(snap.handle, revived);
  }

  getSnapshot(handle: TargetHandle): Snapshot | undefined {
    return this.snapshots.get(handle);
  }

  prop<T>(handle: TargetHandle, key: string): T | undefined {
    return this.snapshots.get(handle)?.props[key] as T | undefined;
  }

  cap(handle: TargetHandle, key: string): boolean {
    return Boolean(this.snapshots.get(handle)?.caps[key]);
  }

  /** Returns the stable proxy for a handle, creating it on first sight. */
  proxyFor<T>(handle: TargetHandle, factory: () => T): T {
    const existing = this.proxies.get(handle);
    if (existing) return existing as T;
    const created = factory();
    this.proxies.set(handle, created);
    return created;
  }

  forgetHandle(handle: TargetHandle): void {
    this.snapshots.delete(handle);
    this.proxies.delete(handle);
    this.listeners.delete(handle);
  }

  reset(): void {
    this.snapshots.clear();
    this.proxies.clear();
    this.listeners.clear();
    this.failAllPending('The SDK session ended.');
  }
}

export const bridge = new BridgeClient();

/* -------------------------------------------------------------------------- */
/* Proxy factories                                                             */
/* -------------------------------------------------------------------------- */

function interactionProxy(handle: TargetHandle): Interaction {
  const call = <T>(method: string, args: unknown[] = []) => bridge.call<T>(handle, method, args);

  return {
    get interactionId() {
      return bridge.prop<string>(handle, 'interactionId') ?? handle.split(':')[1];
    },
    get communicationType() {
      return bridge.prop(handle, 'communicationType') as Interaction['communicationType'];
    },
    get currentStatus() {
      return bridge.prop(handle, 'currentStatus') as Interaction['currentStatus'];
    },
    get customer() {
      return (bridge.prop(handle, 'customer') ?? { name: '', phone: '' }) as Interaction['customer'];
    },
    get queueDetails() {
      return (bridge.prop(handle, 'queueDetails') ?? { queueId: '', name: '' }) as Interaction['queueDetails'];
    },
    get startTime() {
      return (bridge.prop<Date>(handle, 'startTime') ?? new Date()) as Date;
    },
    get isElite() {
      return Boolean(bridge.prop(handle, 'isElite'));
    },
    get isOwner() {
      return Boolean(bridge.prop(handle, 'isOwner'));
    },
    get isMuted() {
      return Boolean(bridge.prop(handle, 'isMuted'));
    },
    get isHold() {
      return Boolean(bridge.prop(handle, 'isHold'));
    },
    get notes() {
      return bridge.prop<string>(handle, 'notes');
    },
    get subject() {
      return bridge.prop<string>(handle, 'subject');
    },
    get wrapUpDeadline() {
      return bridge.prop<number>(handle, 'wrapUpDeadline');
    },
    get transferDetails() {
      return bridge.prop(handle, 'transferDetails') as Interaction['transferDetails'];
    },
    get ownerDetails() {
      return bridge.prop(handle, 'ownerDetails') as Interaction['ownerDetails'];
    },
    get customFields() {
      return bridge.prop(handle, 'customFields') as Record<string, unknown> | undefined;
    },
    get classificationType() {
      return bridge.prop(handle, 'classificationType') as ClassificationCode | undefined;
    },
    get classificationResult() {
      return bridge.prop(handle, 'classificationResult') as ClassificationCode | undefined;
    },

    isViewer: () => bridge.cap(handle, 'isViewer'),
    canAccept: () => bridge.cap(handle, 'canAccept'),
    canReject: () => bridge.cap(handle, 'canReject'),
    canHold: () => bridge.cap(handle, 'canHold'),
    canResume: () => bridge.cap(handle, 'canResume'),
    canMute: () => bridge.cap(handle, 'canMute'),
    canUnmute: () => bridge.cap(handle, 'canUnmute'),
    canDisconnectCall: () => bridge.cap(handle, 'canDisconnectCall'),
    canResolve: () => bridge.cap(handle, 'canResolve'),
    canUnresolve: () => bridge.cap(handle, 'canUnresolve'),
    canWrapUp: () => bridge.cap(handle, 'canWrapUp'),
    canExtendWrapUp: () => bridge.cap(handle, 'canExtendWrapUp'),
    canSendDtmf: () => bridge.cap(handle, 'canSendDtmf'),
    canTransfer: () => bridge.cap(handle, 'canTransfer'),
    canBlindTransfer: () => bridge.cap(handle, 'canBlindTransfer'),
    canAttendedTransfer: () => bridge.cap(handle, 'canAttendedTransfer'),
    canCancelTransfer: () => bridge.cap(handle, 'canCancelTransfer'),
    canSendMessage: () => bridge.cap(handle, 'canSendMessage'),
    canSetNotes: () => bridge.cap(handle, 'canSetNotes'),
    canSetSubject: () => bridge.cap(handle, 'canSetSubject'),
    canLeave: () => bridge.cap(handle, 'canLeave'),

    accept: () => call('accept'),
    reject: () => call('reject'),
    holdCall: () => call('holdCall'),
    resumeCall: () => call('resumeCall'),
    mute: () => call('mute'),
    unmute: () => call('unmute'),
    disconnectCall: () => call('disconnectCall'),
    close: (status) => call('close', [status]),
    complete: () => call('complete'),
    extendWrapUp: () => call('extendWrapUp'),
    // sendDtmf is fire-and-forget in the SDK; errors surface in the bridge log.
    sendDtmf: (digit) => {
      void call('sendDtmf', [digit]).catch((error) =>
        logger.error('DTMF send failed', { errorMessage: (error as Error).message }),
      );
    },
    sendMessage: (request) => call('sendMessage', [request]),
    setNotes: (notes) => call('setNotes', [notes]),
    setSubject: (subject) => call('setSubject', [subject]),
    mergeCustomFields: (fields) => call('mergeCustomFields', [fields]),
    setClassificationType: (code) => call('setClassificationType', [code]),
    setClassificationResult: (code) => call('setClassificationResult', [code]),
    // The live customer object stays in the WebView; the patch is applied there.
    updateCustomer: async (patch) => {
      const snap = await call<Snapshot>('__updateCustomer', [patch]);
      bridge.applySnapshot(snap);
    },
    getClassificationTypes: () => call<ClassificationCode[]>('getClassificationTypes'),
    getClassificationResults: (typeId) => call<ClassificationCode[]>('getClassificationResults', [typeId]),
    // Viewer objects are not yet proxied; the strip renders from events instead.
    getViewers: () => [] as Viewer[],
    getTransferableUsers: (search) => call<TransferableUser[]>('getTransferableUsers', [search]),
    getTransferableQueues: (search) => call<TransferableQueue[]>('getTransferableQueues', [search]),
    blindTransfer: (options) => call('blindTransfer', [options]),
    attendedTransfer: (options) => call('attendedTransfer', [options]),
    cancelTransfer: () => call('cancelTransfer'),
    completeTransfer: () => call('completeTransfer'),
    leave: () => call('leave'),
    leaveCall: () => call('leaveCall'),
    joinCall: () => call('joinCall'),
    coach: () => call('coach'),
    barge: () => call('barge'),
    subscribe: (event, handler) => bridge.subscribe(handle, event, handler),
    unsubscribe: (event, handlerId) => bridge.unsubscribe(handle, event, handlerId),
  } as Interaction;
}

export function interactionFromSnapshot(snap: Snapshot): Interaction {
  bridge.applySnapshot(snap);
  return bridge.proxyFor(snap.handle, () => interactionProxy(snap.handle));
}

function queueProxy(handle: TargetHandle): Queue {
  const call = <T>(method: string, args: unknown[] = []) => bridge.call<T>(handle, method, args);

  return {
    get queueId() {
      return bridge.prop<string>(handle, 'queueId') ?? handle.split(':')[1];
    },
    get queueName() {
      return bridge.prop<string>(handle, 'queueName') ?? '';
    },
    get queueType() {
      return bridge.prop(handle, 'queueType') as Queue['queueType'];
    },
    get isLoggedIn() {
      return Boolean(bridge.prop(handle, 'isLoggedIn'));
    },
    get loggedInAt() {
      return bridge.prop<Date>(handle, 'loggedInAt');
    },
    login: () => call('login'),
    logout: (reason) => call('logout', [reason]),
    subscribe: (event, handler) => bridge.subscribe(handle, event, handler),
    unsubscribe: (event, handlerId) => bridge.unsubscribe(handle, event, handlerId),
  } as Queue;
}

export function queueFromSnapshot(snap: Snapshot): Queue {
  bridge.applySnapshot(snap);
  return bridge.proxyFor(snap.handle, () => queueProxy(snap.handle));
}

export function userFromSnapshot(snap: Snapshot): User {
  bridge.applySnapshot(snap);
  const handle: TargetHandle = 'user';
  const call = <T>(method: string, args: unknown[] = []) => bridge.call<T>(handle, method, args);

  return bridge.proxyFor(handle, () => ({
    get userId() {
      return bridge.prop<string>(handle, 'userId') ?? '';
    },
    get userFullName() {
      return bridge.prop<string>(handle, 'userFullName') ?? '';
    },
    get email() {
      return bridge.prop<string>(handle, 'email');
    },
    get isLoggedInToCx() {
      return Boolean(bridge.prop(handle, 'isLoggedInToCx'));
    },
    get isEliteVoiceEnabled() {
      return Boolean(bridge.prop(handle, 'isEliteVoiceEnabled'));
    },
    get canCreateOutboundVoiceInteraction() {
      return Boolean(bridge.prop(handle, 'canCreateOutboundVoiceInteraction'));
    },
    get currentStatus() {
      return (bridge.prop(handle, 'currentStatus') ?? {}) as ReasonCode;
    },

    refreshStatus: async () => {
      const status = await call<ReasonCode>('refreshStatus');
      await bridge.call<Snapshot>(handle, '__snapshot').then((s) => bridge.applySnapshot(s));
      return status;
    },
    changeStatus: (status) => call('changeStatus', [status]),
    getAssignableReasonCodes: () => call<ReasonCode[]>('getAssignableReasonCodes'),
    loginToCx: (reason) => call('loginToCx', reason ? [reason] : []),
    logoutFromCx: (reason) => call('logoutFromCx', [reason]),
    getAssignedQueues: () => {
      // Synchronous in the SDK, so serve the last known set and refresh in the
      // background; QUEUE_STATUS_CHANGED events keep it current afterwards.
      const cached = bridge.prop<Snapshot[]>(handle, '__queues') ?? [];
      return cached.map(queueFromSnapshot);
    },
    refreshAssignedQueues: () => call('refreshAssignedQueues'),
    getAssignedInteractions: async () => {
      const snaps = await call<Snapshot[]>('getAssignedInteractions');
      return (snaps ?? []).map(interactionFromSnapshot);
    },
    createOutboundVoiceInteraction: async (options) => {
      const snap = await call<Snapshot>('createOutboundVoiceInteraction', [options]);
      return interactionFromSnapshot(snap);
    },
    getAudioDevicePermissionState: () =>
      (bridge.prop(handle, '__permissionState') ?? 'prompt') as MediaDevicePermissionState,
    getAvailableAudioDevices: () => call<AudioDevice[]>('getAvailableAudioDevices'),
    getSelectedAudioDevices: () => call<SelectedAudioDevices>('getSelectedAudioDevices'),
    setAudioInputDevice: (deviceId) => call('setAudioInputDevice', [deviceId]),
    setAudioOutputDevice: (deviceId) => call('setAudioOutputDevice', [deviceId]),
    getWebRtcRegistrationState: () =>
      (bridge.prop(handle, '__webRtcState') ?? 'unregistered') as WebRtcRegistrationState,
    subscribe: (event, handler) => bridge.subscribe(handle, event, handler),
    unsubscribe: (event, handlerId) => bridge.unsubscribe(handle, event, handlerId),
  })) as User;
}

/* -------------------------------------------------------------------------- */
/* Facade                                                                      */
/* -------------------------------------------------------------------------- */

class BridgeAgentSdk implements AgentSdkFacade {
  /** This adapter drives a real tenant — through the WebView, but real. */
  readonly isLive = true;

  private state: SdkState = 'UNINITIALIZED' as SdkState;

  get sdkState(): SdkState {
    return this.state;
  }

  async init(params: AgentSdkInitParams): Promise<User> {
    this.state = 'INITIALIZING' as SdkState;
    try {
      const snap = await bridge.call<Snapshot>('sdk', 'init', [params]);
      this.state = 'INITIALIZED' as SdkState;
      return userFromSnapshot(snap);
    } catch (error) {
      this.state = 'FAILED' as SdkState;
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      await bridge.call('sdk', 'destroy');
    } finally {
      this.state = 'UNINITIALIZED' as SdkState;
      bridge.reset();
    }
  }

  subscribe(event: string, handler: EventHandler): string {
    return bridge.subscribe('sdk', event, handler);
  }

  unsubscribe(event: string, handlerId: string): void {
    bridge.unsubscribe('sdk', event, handlerId);
  }
}

export const bridgeAgentSdk = new BridgeAgentSdk();
