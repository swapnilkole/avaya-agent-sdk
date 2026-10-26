/**
 * Wire protocol between the native shell and the WebView that hosts the real SDK.
 *
 * WHY A BRIDGE
 * ------------
 * `@avaya/infinity-agent-sdk` only runs in a browser. A WebView *is* a browser —
 * it has a DOM, WebRTC, `getUserMedia` and audio elements — so the SDK runs there
 * unmodified while the native screens stay native. The native side sends commands;
 * the WebView replies and streams events back.
 *
 * There is no simulator behind this. If the bridge cannot reach its origin, or the
 * SDK rejects the configuration, native surfaces the real error rather than
 * substituting fabricated data.
 *
 * SHAPE
 * -----
 *   native  --REQ-->  webview   (invoke a method on sdk / user / queue / interaction)
 *   native  <--RES--  webview   (ok + result, or error)
 *   native  <--EVT--  webview   (SDK event, plus a snapshot of mutated state)
 *
 * Everything crossing the boundary is JSON, so live SDK objects cannot be passed.
 * Instead each object is addressed by a handle (`user`, `queue:<id>`,
 * `interaction:<id>`), and the WebView ships plain-data *snapshots* of their
 * observable state. The native proxies in `adapter.native.ts` rebuild objects with
 * the same interface from those snapshots.
 */

/** Addresses a live object living inside the WebView. */
export type TargetHandle =
  | 'sdk'
  | 'user'
  | `queue:${string}`
  | `interaction:${string}`
  | `viewer:${string}`;

export const BRIDGE_PROTOCOL_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Native -> WebView                                                           */
/* -------------------------------------------------------------------------- */

export interface BridgeRequest {
  kind: 'req';
  /** Correlates the response; unique per request. */
  id: string;
  target: TargetHandle;
  /** Method name on the target, e.g. 'init', 'accept', 'loginToCx'. */
  method: string;
  /** JSON-serialisable positional arguments. */
  args?: unknown[];
}

/* -------------------------------------------------------------------------- */
/* WebView -> Native                                                           */
/* -------------------------------------------------------------------------- */

export interface BridgeResponse {
  kind: 'res';
  id: string;
  ok: boolean;
  /** Present when ok; already snapshot-serialised. */
  result?: unknown;
  /** Present when !ok. Carries the SDK's own code so callers can branch on it. */
  error?: { message: string; code?: string; detail?: string };
}

export interface BridgeEvent {
  kind: 'evt';
  /** Which object emitted it. */
  target: TargetHandle;
  /** The SDK's event name, verbatim (e.g. 'interactionAccepted'). */
  event: string;
  /** Event payload, snapshot-serialised. */
  payload?: unknown;
}

/** Emitted once the WebView has loaded and is ready to accept requests. */
export interface BridgeReady {
  kind: 'ready';
  protocol: number;
  /** True when the page detected an OAuth redirect carrying ?code=/?error=. */
  resumingOAuth: boolean;
}

/** Surfaces failures that happen outside any request (load errors, SDK events). */
export interface BridgeFault {
  kind: 'fault';
  message: string;
  code?: string;
}

/** Console/diagnostic passthrough so WebView logs reach the native debugger. */
export interface BridgeLog {
  kind: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

export type BridgeOutbound = BridgeResponse | BridgeEvent | BridgeReady | BridgeFault | BridgeLog;

/* -------------------------------------------------------------------------- */
/* Snapshots                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Plain-data mirror of a live SDK object.
 *
 * `props` holds readable fields; `caps` holds the results of the `can*()`
 * predicates evaluated at snapshot time. Capabilities are captured rather than
 * recomputed natively so the SDK stays the single source of truth about what is
 * permitted — the same rule the web app follows.
 */
export interface Snapshot {
  handle: TargetHandle;
  props: Record<string, unknown>;
  caps: Record<string, boolean>;
}

export interface UserSnapshot extends Snapshot {
  handle: 'user';
}

export interface InteractionSnapshot extends Snapshot {
  handle: `interaction:${string}`;
}

export interface QueueSnapshot extends Snapshot {
  handle: `queue:${string}`;
}

/** Dates do not survive JSON, so they cross as ISO strings and are revived natively. */
export const DATE_PROPS = new Set([
  'startTime',
  'createdAt',
  'loggedInAt',
  'occurredAt',
]);

/** Revives ISO date strings produced by the WebView back into Date objects. */
export function reviveDates<T extends Record<string, unknown>>(props: T): T {
  const next: Record<string, unknown> = { ...props };
  for (const key of Object.keys(next)) {
    if (DATE_PROPS.has(key) && typeof next[key] === 'string') {
      const parsed = new Date(next[key] as string);
      if (!Number.isNaN(parsed.getTime())) next[key] = parsed;
    }
  }
  return next as T;
}
