/**
 * Portable mirror of the Avaya Infinity Agent SDK public surface.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `@avaya/infinity-agent-sdk` v1.0.0 ships a browser-only bundle. It reaches for
 * `document.createElement("audio")`, `navigator.mediaDevices`, `RTCPeerConnection`,
 * `window.open` and `localStorage` — none of which exist in React Native's Hermes
 * runtime. Importing it on iOS/Android throws at module-evaluation time.
 *
 * The SDK's *public typings*, however, contain zero browser types. So the UI can be
 * written against a faithful mirror of that API and bound at runtime to whichever
 * implementation the current platform supports:
 *
 *   web    -> the real SDK          (src/sdk/adapter.web.ts)
 *   native -> the same SDK in a WebView (src/sdk/adapter.native.ts + sdk/bridge/)
 *
 * Every enum value below is copied verbatim from the SDK's `.d.ts`, so values cross
 * the boundary unchanged and the web adapter needs no translation layer.
 */

/* -------------------------------------------------------------------------- */
/* Enums — values stay byte-identical to the SDK's own                         */
/* -------------------------------------------------------------------------- */

export enum OAuthMode {
  REDIRECT = 'redirect',
  POPUP = 'popup',
}

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  OFF = 'OFF',
}

export enum SdkState {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  INITIALIZED = 'INITIALIZED',
  DESTROYING = 'DESTROYING',
  FAILED = 'FAILED',
}

export enum ReasonType {
  AVAILABLE = 'available',
  BUSY = 'busy',
  AWAY = 'away',
  OFFLINE = 'offline',
  LOGOUT = 'queueLogout',
}

export enum ResolutionStatus {
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED',
}

export enum QueueType {
  GENERAL = 'general',
  PERSONAL = 'personal',
  HYBRID = 'hybrid',
  UNKNOWN = 'unknown',
}

export enum InteractionCommType {
  PHONE = 'phone',
  UNKNOWN = 'unknown',
}

export enum InteractionCommSubType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  UNKNOWN = 'unknown',
}

export enum InteractionStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  WRAP_UP = 'wrapUp',
  COMPLETED = 'completed',
  UNKNOWN = 'unknown',
  HOLD = 'hold',
  BLIND_TRANSFER = 'blindTransfer',
  ATTENDED_TRANSFER = 'attendedTransfer',
  OPEN = 'open',
  CREATING = 'creating',
}

export enum MediaDevicePermissionState {
  GRANTED = 'granted',
  DENIED = 'denied',
  PROMPT = 'prompt',
  UNKNOWN = 'unknown',
}

export enum WebRtcRegistrationState {
  UNREGISTERED = 'unregistered',
  REGISTERING = 'registering',
  REGISTERED = 'registered',
  REGISTRATION_FAILED = 'registrationFailed',
  UNREGISTERING = 'unregistering',
  UNREGISTRATION_FAILED = 'unregistrationFailed',
}

export enum MessageType {
  CHAT = 'chat',
  SYSTEM = 'system',
}

export enum MessageAuthorType {
  AGENT = 'agent',
  SYSTEM = 'system',
  CUSTOMER = 'customer',
}

export enum ChatMessageVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum EliteSupervisorMode {
  LISTEN_ONLY = 'listen-only',
  COACH = 'coach',
  LISTEN_TALK = 'listen-talk',
}

export enum SdkEventType {
  SDK_INITIALIZED = 'sdkInitialized',
  SDK_DESTROYED = 'sdkDestroyed',
  SESSION_DESTROYED = 'sessionDestroyed',
  TOKEN_REFRESH_FAILED = 'tokenRefreshFailed',
  INITIALIZATION_FAILED = 'sdkInitializationFailed',
}

export enum UserEventType {
  USER_STATUS_CHANGED = 'userStatusChanged',
  USER_CX_LOGGED_IN = 'userCxLoggedIn',
  USER_CX_LOGGED_OUT = 'userCxLoggedOut',
  AUDIO_DEVICES_CHANGED = 'audioDevicesChanged',
  NO_AUDIO_DEVICE_AVAILABLE = 'noAudioDeviceAvailable',
  AUDIO_DEVICE_PERMISSION_GRANTED = 'audioDevicePermissionGranted',
  AUDIO_DEVICE_PERMISSION_DENIED = 'audioDevicePermissionDenied',
  INTERACTION_RECEIVED = 'interactionReceived',
  INTERACTION_CREATED = 'interactionCreated',
  INTERACTION_VIEWING_STARTED = 'interactionViewingStarted',
  USER_LOGOUT = 'userLogout',
  INTERACTION_AUTO_ACCEPT_FAILED = 'interactionAutoAcceptFailed',
}

export enum QueueEventType {
  QUEUE_STATUS_CHANGED = 'queueStatusChanged',
}

export enum WebSocketConnectionEventType {
  CONNECTING = 'webSocketConnecting',
  CONNECTED = 'webSocketConnected',
  CONNECTION_ERROR = 'webSocketConnectionError',
  RECONNECTION_ATTEMPT_FAILED = 'webSocketReconnectionAttemptFailed',
  RECONNECTING = 'webSocketReconnecting',
  CONNECTION_FAILED = 'webSocketConnectionFailed',
  CONNECTION_CLOSED = 'webSocketConnectionClosed',
}

export enum InteractionEventType {
  INTERACTION_ACCEPTED = 'interactionAccepted',
  INTERACTION_REJECTED = 'interactionRejected',
  INTERACTION_CALL_DISCONNECTED = 'interactionCallDisconnected',
  INTERACTION_WRAP_UP = 'interactionWrapUp',
  INTERACTION_WRAP_UP_EXTENDED = 'interactionWrapUpExtended',
  INTERACTION_COMPLETED = 'interactionCompleted',
  INTERACTION_NOTES_UPDATED = 'interactionNotesUpdated',
  INTERACTION_SUBJECT_UPDATED = 'interactionSubjectUpdated',
  INTERACTION_CUSTOM_FIELDS_UPDATED = 'interactionCustomFieldsUpdated',
  INTERACTION_CALL_MUTED = 'interactionCallMuted',
  INTERACTION_CALL_UNMUTED = 'interactionCallUnmuted',
  INTERACTION_CALL_HELD = 'interactionCallHeld',
  INTERACTION_CALL_RESUMED = 'interactionCallResumed',
  INTERACTION_BLIND_TRANSFERRED = 'interactionBlindTransferred',
  INTERACTION_TRANSFER = 'interactionTransfer',
  INTERACTION_TRANSFER_ANSWER = 'interactionTransferAnswer',
  INTERACTION_TRANSFER_CANCEL = 'interactionTransferCancel',
  INTERACTION_TRANSFER_FAILED = 'interactionTransferFailed',
  INTERACTION_TRANSFER_COMPLETE = 'interactionTransferComplete',
  INTERACTION_CALL_ESTABLISHED = 'interactionCallEstablished',
  INTERACTION_CONFERENCE = 'interactionConference',
  INTERACTION_CONFERENCE_COMPLETE = 'interactionConferenceComplete',
  INTERACTION_VIEWER_ADDED = 'interactionViewerAdded',
  INTERACTION_VIEWER_JOINED_CALL = 'interactionViewerJoinedCall',
  INTERACTION_VIEWER_REMOVED = 'interactionViewerRemoved',
  INTERACTION_VIEWER_LEFT_CALL = 'interactionViewerLeftCall',
  INTERACTION_CLASSIFICATION_UPDATED = 'interactionClassificationUpdated',
  INTERACTION_CUSTOMER_INFO_UPDATED = 'interactionCustomerInfoUpdated',
  INTERACTION_CALL_FAILED = 'interactionCallFailed',
  INTERACTION_OWNERSHIP_CHANGED = 'interactionOwnershipChanged',
  INTERACTION_MESSAGE_RECEIVED = 'interactionMessageReceived',
  INTERACTION_MESSAGE_SENT = 'interactionMessageSent',
  INTERACTION_VIEWER_BARGE_STARTED = 'interactionViewerBargeStarted',
  INTERACTION_VIEWER_BARGE_ENDED = 'interactionViewerBargeEnded',
  INTERACTION_VIEWER_COACH_STARTED = 'interactionViewerCoachStarted',
  INTERACTION_VIEWER_COACH_ENDED = 'interactionViewerCoachEnded',
}

/* -------------------------------------------------------------------------- */
/* Data shapes                                                                 */
/* -------------------------------------------------------------------------- */

export interface ReasonCode {
  type: ReasonType;
  reason?: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface SelectedAudioDevices {
  input?: AudioDevice;
  output?: AudioDevice;
}

export interface QueueDetails {
  queueId: string;
  name: string;
  wrapUpDuration?: number;
  wrapUpExtendDuration?: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email?: string;
  languageCode?: string;
}

export interface UserDetails {
  userId: string;
  name: string;
  fullName?: string;
  email?: string;
}

export interface TransferDetails {
  transferType: 'blind' | 'attended';
  isAnswered?: boolean;
  user?: UserDetails;
  queue?: QueueDetails;
}

export interface ClassificationCode {
  id: string;
  name: string;
}

export interface MessageAuthorDetails {
  userId?: string;
  displayName: string;
  avatarUrl?: string;
}

export interface MessageAuthor {
  type: MessageAuthorType;
  details?: MessageAuthorDetails;
}

export interface Message {
  messageId: string;
  type: MessageType;
  author: MessageAuthor;
  body: { text: { content: string } };
  createdAt: Date;
  isPrivate: boolean;
  /** Local-only flag used for optimistic rendering before the server echoes the send. */
  pending?: boolean;
}

export interface TransferableUser {
  userId: string;
  name: string;
  status?: string;
}

export interface TransferableQueue {
  queueId: string;
  name: string;
}

/* -------------------------------------------------------------------------- */
/* Event payloads                                                              */
/* -------------------------------------------------------------------------- */

export type EventHandler<T = any> = (event: T) => unknown;

export interface InteractionReceivedEvent {
  payload: { interaction: Interaction };
}
export interface InteractionCreatedEvent {
  payload: { interaction: Interaction };
}
export interface InteractionViewingStartedEvent {
  payload: { interaction: Interaction };
}
export interface InteractionAutoAcceptFailedEvent {
  payload: { interaction: Interaction };
}
export interface UserStatusChangedEvent {
  payload: { status: ReasonCode };
}
export interface SdkInitializationFailedEvent {
  payload: { error: { message: string; code?: string } };
}
export interface SessionDestroyedEvent {
  payload: { errorMessage: string };
}

/* -------------------------------------------------------------------------- */
/* Behavioural interfaces                                                      */
/* -------------------------------------------------------------------------- */

export interface Viewer {
  id: string;
  name: string;
  isMuted: boolean;
  isOnCall: boolean;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  remove(): Promise<void>;
  assignOwner(): Promise<void>;
}

export interface Queue {
  readonly queueId: string;
  readonly queueName: string;
  readonly queueType: QueueType;
  readonly isLoggedIn: boolean;
  readonly loggedInAt?: Date;
  login(): Promise<void>;
  logout(reason: ReasonCode): Promise<void>;
  subscribe(event: QueueEventType, handler: EventHandler): string;
  unsubscribe(event: QueueEventType, handlerId: string): void;
}

export interface Interaction {
  readonly interactionId: string;
  readonly communicationType: InteractionCommType;
  readonly currentStatus: InteractionStatus;
  readonly customer: CustomerDetails;
  readonly queueDetails: QueueDetails;
  readonly startTime: Date;
  readonly isElite: boolean;
  readonly isOwner: boolean;
  readonly isMuted: boolean;
  readonly isHold: boolean;
  readonly notes?: string;
  readonly subject?: string;
  readonly wrapUpDeadline?: number;
  readonly transferDetails?: TransferDetails;
  readonly ownerDetails?: { userId: string; fullName: string };
  readonly customFields?: Record<string, unknown>;
  readonly classificationType?: ClassificationCode;
  readonly classificationResult?: ClassificationCode;

  isViewer(): boolean;
  canAccept(): boolean;
  canReject(): boolean;
  canHold(): boolean;
  canResume(): boolean;
  canMute(): boolean;
  canUnmute(): boolean;
  canDisconnectCall(): boolean;
  canResolve(): boolean;
  canUnresolve(): boolean;
  canWrapUp(): boolean;
  canExtendWrapUp(): boolean;
  canSendDtmf(): boolean;
  canTransfer(): boolean;
  canBlindTransfer(): boolean;
  canAttendedTransfer(): boolean;
  canCancelTransfer(): boolean;
  canSendMessage(): boolean;
  canSetNotes(): boolean;
  canSetSubject(): boolean;
  canLeave(): boolean;

  accept(): Promise<void>;
  reject(): Promise<void>;
  holdCall(): Promise<void>;
  resumeCall(): Promise<void>;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  disconnectCall(): Promise<void>;
  close(status: ResolutionStatus): Promise<void>;
  complete(): Promise<void>;
  extendWrapUp(): Promise<void>;
  sendDtmf(digit: string): void;
  sendMessage(request: { content: string; visibility: ChatMessageVisibility }): Promise<void>;
  setNotes(notes: string): Promise<void>;
  setSubject(subject: string): Promise<void>;
  mergeCustomFields(fields: Record<string, unknown>): Promise<void>;
  setClassificationType(code: ClassificationCode): Promise<void>;
  setClassificationResult(code: ClassificationCode): Promise<void>;
  /**
   * Bridge-only patch call for editing customer fields. In-process (web) the SDK
   * exposes setters on `interaction.customer` (setName/setPhone/…) instead; over
   * the bridge that object is only a snapshot, so the patch is applied on the far
   * side. UI code goes through `updateCustomerField()` in `src/sdk/customer.ts`,
   * which picks whichever API the active adapter provides.
   */
  updateCustomer?(patch: Partial<CustomerDetails>): Promise<void>;
  getClassificationTypes(): Promise<ClassificationCode[]>;
  getClassificationResults(typeId: string): Promise<ClassificationCode[]>;
  getViewers(): Viewer[];
  getTransferableUsers(search?: string): Promise<TransferableUser[]>;
  getTransferableQueues(search?: string): Promise<TransferableQueue[]>;
  blindTransfer(options: { userId?: string; queueId?: string; phoneNumber?: string }): Promise<void>;
  attendedTransfer(options: { userId?: string; queueId?: string; phoneNumber?: string }): Promise<void>;
  cancelTransfer(): Promise<void>;
  completeTransfer(): Promise<void>;
  leave(): Promise<void>;
  leaveCall(): Promise<void>;
  joinCall(): Promise<void>;
  coach(): Promise<void>;
  barge(): Promise<void>;
  subscribe(event: InteractionEventType, handler: EventHandler): string;
  unsubscribe(event: InteractionEventType, handlerId: string): void;
}

export interface User {
  readonly userId: string;
  readonly userFullName: string;
  readonly email?: string;
  readonly isLoggedInToCx: boolean;
  readonly isEliteVoiceEnabled: boolean;
  readonly canCreateOutboundVoiceInteraction: boolean;
  readonly currentStatus: ReasonCode;

  refreshStatus(): Promise<ReasonCode>;
  changeStatus(status: ReasonCode): Promise<void>;
  getAssignableReasonCodes(): Promise<ReasonCode[]>;
  loginToCx(reason?: ReasonCode): Promise<void>;
  logoutFromCx(reason: ReasonCode): Promise<void>;
  getAssignedQueues(): Queue[];
  refreshAssignedQueues(): Promise<void>;
  getAssignedInteractions(): Promise<Interaction[]>;
  createOutboundVoiceInteraction(options: {
    phoneNumber: string;
    queueId?: string;
    customer?: Partial<CustomerDetails>;
    subject?: string;
    notes?: string;
  }): Promise<Interaction>;
  getAudioDevicePermissionState(): MediaDevicePermissionState;
  getAvailableAudioDevices(): Promise<AudioDevice[]>;
  getSelectedAudioDevices(): Promise<SelectedAudioDevices>;
  setAudioInputDevice(deviceId: string): Promise<void>;
  setAudioOutputDevice(deviceId: string): Promise<void>;
  getWebRtcRegistrationState(): WebRtcRegistrationState;
  subscribe(event: UserEventType, handler: EventHandler): string;
  unsubscribe(event: UserEventType, handlerId: string): void;
}

/* -------------------------------------------------------------------------- */
/* SDK facade                                                                  */
/* -------------------------------------------------------------------------- */

export interface AgentSdkInitParams {
  avayaInfinityHost: string;
  clientId: string;
  oAuthRedirectUri: string;
  oAuthMode?: OAuthMode;
  idpHint?: string;
  logLevel?: LogLevel;
}

/**
 * The contract every platform adapter fulfils. Mirrors the static shape of the real
 * `AvayaInfinityAgentSdk` class so UI code reads identically on both sides.
 */
export interface AgentSdkFacade {
  readonly sdkState: SdkState;
  /** True when this adapter drives a real Avaya backend. */
  readonly isLive: boolean;
  init(params: AgentSdkInitParams): Promise<User>;
  destroy(): Promise<void>;
  subscribe(event: SdkEventType | WebSocketConnectionEventType, handler: EventHandler): string;
  unsubscribe(event: SdkEventType | WebSocketConnectionEventType, handlerId: string): void;
}

/** Shape-compatible stand-in for the SDK's own error class. */
export class AgentSdkError extends Error {
  code: string;
  detail?: string;

  constructor(message: string, code = 'ASE_1000', detail?: string) {
    super(message);
    this.name = 'AgentSdkError';
    this.code = code;
    this.detail = detail;
  }

  static is(error: unknown): error is AgentSdkError {
    return (
      error instanceof AgentSdkError
      || (error instanceof Error && typeof (error as { code?: unknown }).code === 'string')
    );
  }
}
