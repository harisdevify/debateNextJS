'use client';
import { ChatInputRow } from '@/components/debate/ChatInputRow';
import { PageState } from '@/components/ui/PageState';
import { DebateSetup } from '@/components/debate/DebateSetup';
import { PreDebateCheck } from '@/components/debate/PreDebateCheck';
import { MatchSearchStatus } from '@/components/debate/MatchSearchStatus';
import { MicrophoneActivity } from '@/components/debate/MicrophoneActivity';
import { useLiveCaptions } from '@/components/debate/LiveCaptions';
import { AppSelect } from '@/components/ui/AppSelect';
import { DEFAULT_DEBATE_PREFERENCES, DEBATE_TOPICS, DEBATE_LANGUAGES, DEBATE_MODES } from '@/lib/debate-preferences';
import type { DebatePreferences } from '@/types';
import { BlockDialog } from '@/components/debate/BlockDialog';
import { ReportDialog } from '@/components/debate/ReportDialog';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage, DebateStatus } from '@/types';
import {
  Flag,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Captions,
  CaptionsOff,
  UserX,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebateRoom } from '../../hooks/useDebateRoom';

const PLACEHOLDER = 'var(--background)';

// What to show on top of the remote video until a partner is connected
const STATUS_TEXT: Record<Exclude<DebateStatus, 'connected'>, string> = {
  starting: 'Starting your camera…',
  connecting: 'Connecting video…',
  reconnecting: 'Connection interrupted. Reconnecting…',
  searching: 'Looking for a debate partner…',
  idle: 'Search paused. Your camera and microphone are still ready.',
  'peer-left': 'Your partner left the debate.',
  blocked: 'You blocked this user. You will not be matched with each other again.',
  error: 'Could not start. Check camera access and refresh.',
  completed: 'Formal debate completed. Both speakers received equal speaking time.',
};

/* ── Chat Body ─────────────────────────────── */
function ChatBody({ msgs }: { msgs: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-3.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {msgs.length === 0 ? (
        <p className="m-auto text-white/40 text-xs tracking-widest">
          No messages yet
        </p>
      ) : (
        msgs.map((m) => (
          <div
            key={m.id}
            className={`max-w-[82%] px-3.5 py-2 rounded-[18px] text-sm leading-relaxed break-words
              animate-[bubIn_0.24s_cubic-bezier(0.34,1.56,0.64,1)_both]
              ${
                m.sender === 'me'
                  ? 'ml-auto bg-gradient-to-br from-[#00e5c0] to-[#00aaff] text-white rounded-br-[4px] shadow-[0_2px_14px_rgba(0,229,192,0.2)]'
                  : 'mr-auto bg-white/7 text-[#dde2ee] border border-white/7 rounded-bl-[4px]'
              }`}
          >
            {m.text}
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}

/* ── Chat Input ────────────────────────────── */
/* ── Main Page ─────────────────────────────── */
function DebateRoom({ preferences, initialStream, onChangePreferences }: { preferences: DebatePreferences; initialStream: MediaStream; onChangePreferences: () => void }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const router = useRouter();
  const {
    status,
    searchStartedAt,
    searchConfirmed,
    cancelSearch,
    retrySearch,
    peerName,
    messages: msgs,
    peerCaption,
    sendCaption,
    sendMessage,
    findNext,
    reportPartner,
    blockPartner,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    screenSharing,
    peerScreenSharing,
    screenShareBusy,
    micOn,
    camOn,
    connectionQuality,
    connectionRoute,
    availableDevices,
    selectedDeviceIds,
    switchingDevice,
    switchDevice,
    refreshDevices,
    formalState,
    maySpeak,
    debateRemainingMs,
    turnRemainingMs,
  } = useDebateRoom(localRef, remoteRef, preferences, initialStream);

  const formatRemaining = (value: number | null) => {
    if (value === null) return '--:--';
    const seconds = Math.ceil(value / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
  const captions = useLiveCaptions({
    status, language: preferences.language, micOn, maySpeak, onCaption: sendCaption,
  });
  const partnerConnected = status === 'connected';
    const [chatOpen, setChatOpen] = useState(false);
  // messages the user has already seen (mobile chat drawer)
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [readCount, setReadCount] = useState(0);
  const unread = chatOpen
    ? 0
    : msgs.slice(readCount).filter((m) => m.sender === 'other').length;

  useEffect(() => {
    if (!chatOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setChatOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [chatOpen]);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (wide.matches) setChatOpen(false); };
    wide.addEventListener('change', closeOnDesktop);
    return () => wide.removeEventListener('change', closeOnDesktop);
  }, []);

  const openChat = () => {
    if (!partnerConnected) return;
    setChatOpen(true);
    setReadCount(msgs.length);
  };
  const closeChat = () => {
    setChatOpen(false);
    setReadCount(msgs.length);
  };
  const handleSend = (text: string) => sendMessage(text);
  useEffect(() => {
    if (status !== 'connected') setChatOpen(false);
  }, [status]);

  const handleNext = () => {
    setReadCount(0);
    findNext();
  };

  return (
    <>
      {/* PAGE */}
      <div className="relative flex flex-col min-h-[calc(100svh-56px)] bg-[#07090e] lg:h-[calc(100dvh-56px)] lg:overflow-hidden font-[DM_Sans,sans-serif]">
        {/* BODY */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* ── STAGE ── */}
          <section
            className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 transition-all duration-300 sm:p-4 lg:gap-3.5
              ${chatOpen ? 'blur-sm brightness-50 pointer-events-none' : ''}`}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111b19] px-3 py-2 text-xs sm:px-4" aria-label="Debate preferences and connection">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-white/70">
                <span className="max-w-full truncate font-semibold text-white/90">{DEBATE_TOPICS.find((t) => t.value === preferences.topic)?.label}</span>
                <span className="text-white/25">/</span>
                <span>{DEBATE_LANGUAGES.find((l) => l.value === preferences.language)?.label}</span>
                <span className="text-white/25">/</span>
                <span>{DEBATE_MODES.find((m) => m.value === preferences.mode)?.label}</span>
              </div>
              <button type="button" onClick={onChangePreferences}
                className="min-h-9 shrink-0 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10">
                Edit
              </button>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111b19] px-3 py-2 sm:px-4" aria-label="Live media diagnostics">
              <span role="status" className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${partnerConnected ? 'border-primary/25 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/60'}`}>
                <span className={`size-1.5 shrink-0 rounded-full ${partnerConnected ? 'bg-primary' : 'bg-amber-300'}`} />
                {partnerConnected ? connectionQuality === 'checking' ? 'Connected · Checking quality' : `Connected · ${connectionQuality}` : status === 'searching' ? 'Searching for partner' : status === 'reconnecting' ? 'Reconnecting' : 'Waiting for connection'}
              </span>
              {partnerConnected && <span className="hidden text-xs text-white/45 sm:inline" aria-label="Video connection path">{connectionRoute === 'relay' ? 'TURN relay' : connectionRoute === 'direct' ? 'Direct connection' : 'Checking route'}</span>}
              <div className="ml-auto flex items-center gap-2">
                <MicrophoneActivity stream={initialStream} enabled={micOn && partnerConnected} />
                <details className="group relative text-sm text-white/75" onToggle={(event) => { if (event.currentTarget.open) void refreshDevices(); }}>
                  <summary className="flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 px-2.5 text-xs font-medium hover:bg-white/5">Devices</summary>
                  <div className="absolute right-0 top-full z-30 mt-2 w-[min(300px,calc(100vw-2rem))] space-y-3 rounded-xl border border-white/20 bg-[#111e1a] p-4 shadow-xl">
                    <label htmlFor="live-camera" className="block text-xs font-semibold text-white/70">Camera</label>
                    <AppSelect id="live-camera" aria-label="Camera device" disabled={switchingDevice || status === 'completed'} value={selectedDeviceIds.video} onChange={(event) => { void switchDevice('video', event.target.value); }}>
                      {!availableDevices.some(device => device.kind === 'videoinput' && device.deviceId === selectedDeviceIds.video) && <option value={selectedDeviceIds.video}>Current camera</option>}
                      {availableDevices.filter(device => device.kind === 'videoinput').map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${i + 1}`}</option>)}
                    </AppSelect>
                    <label htmlFor="live-mic" className="block text-xs font-semibold text-white/70">Microphone</label>
                    <AppSelect id="live-mic" aria-label="Microphone device" disabled={switchingDevice || status === 'completed'} value={selectedDeviceIds.audio} onChange={(event) => { void switchDevice('audio', event.target.value); }}>
                      {!availableDevices.some(device => device.kind === 'audioinput' && device.deviceId === selectedDeviceIds.audio) && <option value={selectedDeviceIds.audio}>Current microphone</option>}
                      {availableDevices.filter(device => device.kind === 'audioinput').map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${i + 1}`}</option>)}
                    </AppSelect>
                    <p className="text-xs text-white/50">{switchingDevice ? 'Switching device…' : 'Device changes keep the debate active.'}</p>
                  </div>
                </details>
              </div>
            </div>
            {preferences.mode === 'formal' && formalState && status !== 'completed' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3" role="status" aria-live="off">
                <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Formal debate · Turn {formalState.turnNumber} of 6</p><p className="mt-1 text-sm font-semibold text-white">{status === 'reconnecting' ? 'Reconnecting — timer continues' : maySpeak ? 'Your turn to speak' : "Partner's turn — your microphone is off"}</p></div>
                <div className="flex gap-6 text-right"><div><p className="text-xs text-white/50">Turn</p><p className="font-mono text-lg font-bold text-white">{formatRemaining(turnRemainingMs)}</p></div><div><p className="text-xs text-white/50">Debate</p><p className="font-mono text-lg font-bold text-white">{formatRemaining(debateRemainingMs)}</p></div></div>
              </div>
            )}
            {status === 'completed' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3" role="status">
                <div><p className="font-semibold text-white">Debate completed</p><p className="text-sm text-white/60">10 minutes completed · 5 minutes for each speaker</p></div>
                <button onClick={onChangePreferences} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-hover">Start another debate</button>
              </div>
            )}
            {/* VIDEO GRID */}
            <div
              className="relative grid min-h-[min(54svh,520px)] min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(280px,1fr)_auto] gap-2 sm:min-h-[420px] sm:grid-cols-[minmax(0,1.65fr)_minmax(190px,0.75fr)] sm:grid-rows-1 lg:min-h-0 lg:grid-cols-[minmax(0,1.8fr)_minmax(200px,0.75fr)]"
            >
              {/* Remote tile */}
              <div
                className="relative min-h-[280px] overflow-hidden rounded-2xl bg-[#101b18]
                              border border-white/15 shadow-[0_18px_48px_rgba(0,0,0,0.4)]"
              >
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className={`absolute inset-0 block h-full w-full ${peerScreenSharing ? 'object-contain' : 'object-cover'}`}
                  style={{ background: PLACEHOLDER }}
                />
                {status === 'connected' && peerScreenSharing && (
                  <span className="absolute bottom-14 left-3 rounded-lg border border-primary/30 bg-[#07130f]/90 px-3 py-1.5 text-xs font-semibold text-primary" role="status">
                    Partner is sharing their screen
                  </span>
                )}
                {/* gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

                {partnerConnected && captions.enabled && (
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex justify-center" aria-live="polite" aria-atomic="true">
                    {peerCaption ? (
                      <p className="max-w-[95%] rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-center text-sm leading-5 text-white shadow-lg backdrop-blur-sm" aria-label="Partner subtitle">
                        {peerCaption}
                      </p>
                    ) : (
                      <span className="rounded-md bg-black/60 px-3 py-1.5 text-xs text-white/55">Waiting for partner captions…</span>
                    )}
                  </div>
                )}
                {/* status until a partner is connected */}
                {status !== 'connected' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 px-6 text-center">
                    {status === 'searching' ? (
                      <MatchSearchStatus startedAt={searchStartedAt} confirmed={searchConfirmed} onCancel={cancelSearch} onChangePreferences={onChangePreferences} />
                    ) : <p className="text-sm text-white/70">{STATUS_TEXT[status]}</p>}
                    {status === 'idle' && <div className="flex flex-wrap justify-center gap-3">
                      <button type="button" onClick={() => void retrySearch()} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-background">Resume searching</button>
                      <button type="button" onClick={onChangePreferences} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm text-white">Change preferences</button>
                    </div>}
                    {(status === 'peer-left' || status === 'blocked' || status === 'error') && (
                      <button
                        onClick={handleNext}
                        className="pressable rounded-full bg-primary px-5 py-2 text-sm font-bold text-background transition-colors hover:bg-primary-hover"
                      >
                        Retry search
                      </button>
                    )}
                    {status === 'peer-left' && (
                      <button
                        onClick={() => setReportOpen(true)}
                        className="pressable text-xs text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
                      >
                        Report this user
                      </button>
                    )}
                  </div>
                )}

                <span
                  className="absolute top-3 left-3 text-[0.68rem] font-semibold tracking-[0.1em] uppercase
                                 text-white/65 bg-[rgba(7,9,14,0.55)] backdrop-blur-[10px]
                                 px-2.5 py-1 rounded-full border border-white/9"
                >
                  {status === 'connected' && peerName ? peerName : 'Partner'}
                </span>

                {status === 'connected' && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => setReportOpen(true)}
                      aria-label="Report this user"
                      title="Report"
                      className="pressable flex size-11 items-center justify-center rounded-full border border-white/10 bg-background/70 text-white/75 backdrop-blur-[10px] transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <Flag size={13} />
                    </button>
                    <button
                      onClick={() => setBlockOpen(true)}
                      aria-label="Block this user"
                      title="Block"
                      className="pressable flex size-11 items-center justify-center rounded-full border border-white/10 bg-background/70 text-white/75 backdrop-blur-[10px] transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      <UserX size={13} />
                    </button>
                    <button
                      onClick={handleNext}
                      className="pressable min-h-11 rounded-full border border-white/10 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/75 backdrop-blur-[10px] transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Local tile — teal glow ring */}
              <div
                className="relative min-h-[160px] overflow-hidden rounded-2xl bg-[#101b18]
                              border border-white/7
                              shadow-[inset_0_0_0_1px_rgba(0,217,189,0.2),0_18px_48px_rgba(0,0,0,0.4)]"
              >
                <video
                  ref={localRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 block h-full w-full object-cover"
                  style={{ background: PLACEHOLDER }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
                <span
                  className="absolute top-3 left-3 text-[0.68rem] font-semibold tracking-[0.1em] uppercase
                                 text-white/65 bg-[rgba(7,9,14,0.55)] backdrop-blur-[10px]
                                 px-2.5 py-1 rounded-full border border-white/9"
                >
                  You
                </span>
              </div>
            </div>

            {status === 'connected' && screenSharing && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm text-white/85" role="status">
                <span>Your screen is being shared with your debate partner. Your camera preview stays visible to you.</span>
                <button type="button" onClick={() => void stopScreenShare()} className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-primary hover:bg-primary/10">
                  Stop sharing
                </button>
              </div>
            )}
            {/* CONTROLS */}
            <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#111b19] px-3 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,.22)] sm:gap-3">
              {/* Mic */}
              <button
                onClick={() => {
                  toggleMic();

                }}
                title={!maySpeak ? 'Wait for your speaking turn' : micOn ? 'Mute' : 'Unmute'}
                 disabled={!maySpeak || status === 'completed'}
                 aria-label={!maySpeak ? 'Microphone disabled until your turn' : micOn ? 'Mute microphone' : 'Unmute microphone'}
                className={`relative w-11 h-11 rounded-full border cursor-pointer
                  flex items-center justify-center outline-none
                  backdrop-blur-[8px] transition-all duration-200
                  active:scale-[0.87]
                  min-w-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary/60
                  ${
                    micOn
                      ? 'bg-white/7 border-white/11 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:scale-110 hover:bg-[rgba(0,153,255,0.55)] hover:border-transparent hover:shadow-[0_6px_24px_rgba(0,153,255,0.4)]'
                      : 'bg-[rgba(255,59,92,0.1)] border-[rgba(255,59,92,0.28)] hover:scale-110 hover:bg-[rgba(255,59,92,0.4)] hover:shadow-[0_6px_24px_rgba(255,59,92,0.35)]'
                  }`}
              >
                {micOn ? (
                  <Mic size={19} color="#fff" />
                ) : (
                  <MicOff size={19} color="#ff7070" />
                )}
              </button>

              {/* Camera */}
              <button
                onClick={() => {
                  toggleCamera();

                }}
                title={camOn ? 'Camera off' : 'Camera on'}
                aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
                className={`relative w-11 h-11 rounded-full border cursor-pointer
                  flex items-center justify-center outline-none
                  backdrop-blur-[8px] transition-all duration-200
                  active:scale-[0.87]
                  min-w-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary/60
                  ${
                    camOn
                      ? 'bg-white/7 border-white/11 shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:scale-110 hover:bg-[rgba(0,153,255,0.55)] hover:border-transparent hover:shadow-[0_6px_24px_rgba(0,153,255,0.4)]'
                      : 'bg-[rgba(255,59,92,0.1)] border-[rgba(255,59,92,0.28)] hover:scale-110 hover:bg-[rgba(255,59,92,0.4)] hover:shadow-[0_6px_24px_rgba(255,59,92,0.35)]'
                  }`}
              >
                {camOn ? (
                  <Video size={19} color="#fff" />
                ) : (
                  <VideoOff size={19} color="#ff7070" />
                )}
              </button>

              {/* Screen sharing uses the existing video stream; camera returns on stop. */}
              <button
                type="button"
                onClick={() => { if (screenSharing) void stopScreenShare(); else void startScreenShare(); }}
                disabled={status !== 'connected' || screenShareBusy ||
                  (!screenSharing && typeof navigator !== 'undefined' && !navigator.mediaDevices?.getDisplayMedia)}
                aria-label={screenSharing ? 'Stop screen sharing' : 'Share screen'}
                aria-pressed={screenSharing}
                title={screenSharing ? 'Stop screen sharing' : 'Share your screen'}
                className={`relative flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-40 ${screenSharing ? 'border-primary bg-primary/15 text-primary' : 'border-white/15 bg-white/7 text-white hover:bg-white/15'}`}
              >
                {screenSharing ? <MonitorOff size={19} aria-hidden="true" /> : <MonitorUp size={19} aria-hidden="true" />}
              </button>

              {/* Captions: own speech is transmitted but only partner text is displayed. */}
              <button type="button" onClick={captions.toggle} disabled={!captions.supported}
                aria-label={captions.enabled ? 'Turn captions off' : 'Turn captions on'} aria-pressed={captions.enabled}
                title={!captions.supported ? 'Captions not supported in this browser' : captions.enabled ? 'Turn captions off' : 'Turn captions on'}
                className={`relative flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-40 ${captions.enabled ? 'border-primary/45 bg-primary/15 text-primary' : 'border-white/15 bg-white/7 text-white/80 hover:bg-white/15'}`}>
                {captions.enabled ? <Captions size={19} aria-hidden="true" /> : <CaptionsOff size={19} aria-hidden="true" />}
              </button>

              {/* End Call */}
              <button
                onClick={() => router.push('/')}
                title="End Call"
                aria-label="End debate"
                className="relative w-12 h-12 rounded-full border-none cursor-pointer
                  flex items-center justify-center outline-none
                  bg-[#ff3b5c] shadow-[0_4px_22px_rgba(255,59,92,0.45)]
                  transition-all duration-200
                  hover:scale-110 hover:bg-[#ff1a3a] hover:shadow-[0_8px_30px_rgba(255,59,92,0.6)]
                  active:scale-[0.87]
                  min-w-12 min-h-12 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <PhoneOff size={21} color="#fff" className="rotate-[135deg]" />
              </button>

              {/* Chat is available only after the partner connects. */}
              {partnerConnected && <button
                onClick={openChat}
                title="Chat"
                aria-label={unread > 0 ? `Open chat, ${unread} unread messages` : 'Open chat'}
                aria-haspopup="dialog"
                aria-expanded={chatOpen}
                className="relative lg:hidden w-11 h-11 rounded-full border-none cursor-pointer
                  flex items-center justify-center outline-none
                  bg-gradient-to-br from-[#00e5c0] to-[#00aaff]
                  shadow-[0_4px_22px_rgba(0,229,192,0.32)]
                  transition-all duration-200
                  hover:scale-110 hover:shadow-[0_8px_30px_rgba(0,229,192,0.48)]
                  active:scale-[0.87]
                  min-w-11 min-h-11 focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <MessageCircle size={19} color="#fff" />
                {unread > 0 && (
                  <span
                    className="badge-anim absolute top-0.5 right-0.5
                    min-w-[17px] h-[17px] rounded-full px-1
                    bg-[#ff3b5c] text-white text-[0.6rem] font-bold
                    flex items-center justify-center
                    border-2 border-[#07090e]"
                  >
                    {unread}
                  </span>
                )}
              </button>}
            </div>
            {captions.error && <p role="alert" className="text-center text-xs text-amber-300">{captions.error}</p>}
            {captions.enabled && <p className="text-center text-[11px] text-white/40">Captions use your browser’s speech service. No transcripts are stored.</p>}
          </section>

          {/* ── DESKTOP CHAT ASIDE (hidden on mobile) ── */}
          {partnerConnected && <aside aria-label="Debate chat" className="hidden min-h-0 w-[min(30vw,345px)] min-w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#101815] lg:flex">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b border-white/7 shrink-0">
              <div className="live-dot w-2 h-2 rounded-full bg-[#00e5c0] shadow-[0_0_9px_rgba(0,229,192,0.7)]" />
              <span className="text-[0.73rem] font-semibold tracking-[0.09em] uppercase text-white/40">
                Live Chat
              </span>
            </div>
            <ChatBody msgs={msgs} />
            <ChatInputRow onSend={handleSend} />
          </aside>}
        </div>

        {partnerConnected && <>
        {/* ── MOBILE BACKDROP ── */}
        <div
          onClick={closeChat}
          className={`lg:hidden fixed inset-0 z-[90] bg-[rgba(7,9,14,0.72)] backdrop-blur-[8px]
            transition-opacity duration-300
            ${chatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        />

        {/* ── MOBILE DRAWER ── */}
        <div
          role="dialog"
          aria-label="Debate chat"
          aria-modal={chatOpen}
          inert={!chatOpen}
          aria-hidden={!chatOpen}
          className={`lg:hidden fixed inset-x-0 bottom-0 z-[100] flex flex-col h-[min(78dvh,640px)]
            bg-[#0f1219] rounded-t-[26px]
            border border-b-0 border-white/9
            shadow-[0_-18px_60px_rgba(0,0,0,0.65)]
             overflow-hidden pb-[env(safe-area-inset-bottom)]
             transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]
            ${chatOpen ? 'translate-y-0' : 'translate-y-full'}`}
        >
          {/* Drag pill */}
          <div className="w-9 h-1 rounded-full bg-white/16 mx-auto mt-3 shrink-0" />

          {/* Drawer header */}
          <div className="flex items-center justify-between px-4.5 pt-2.5 pb-3 border-b border-white/7 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="live-dot w-2 h-2 rounded-full bg-[#00e5c0] shadow-[0_0_9px_rgba(0,229,192,0.7)]" />
              <span className="text-[0.82rem] font-semibold tracking-[0.06em] text-[#dde2ee]">
                Live Chat
              </span>
            </div>
            <button
              onClick={closeChat}
              aria-label="Close chat"
              className="size-11 rounded-full
                bg-white/7 border border-white/10
                flex items-center justify-center cursor-pointer
                transition-all duration-200
                hover:bg-[rgba(255,59,92,0.25)] hover:scale-110"
            >
              <X size={15} color="rgba(221,226,238,0.7)" />
            </button>
          </div>

          <ChatBody msgs={msgs} />
          <ChatInputRow onSend={handleSend} />
        </div>
        </>}
      </div>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={reportPartner}
      />
      <BlockDialog
        open={blockOpen}
        name={peerName}
        onClose={() => setBlockOpen(false)}
        onConfirm={blockPartner}
      />
    </>
  );
}

/* ── Auth gate ─────────────────────────────── */
// DebateRoom (camera/mic/socket hooks) only mounts once the user is confirmed.
export default function VideoPage() {
  const { user, loading, verificationError, retrySession } = useAuth();
  const router = useRouter();

  const accepted = !!user?.acceptedRulesAt && !!user?.ageConfirmedAt;

  useEffect(() => {
    if (loading || verificationError) return;
    if (!user) {
      router.replace('/login');
    } else if (!accepted) {
      // accounts created before the rules existed accept them first
      toast.info('Please accept the rules to join a debate.');
      router.replace('/rules');
    }
  }, [loading, verificationError, user, accepted, router]);

  if (loading) return <PageState title="Checking your session…" description="Verifying your account before opening the camera." />;
  if (verificationError) return <PageState status="alert" title="Connection interrupted" description="Your session could not be verified. Your login has not been cleared." action={<button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-background" onClick={() => void retrySession()}>Retry session</button>} />;
  if (!user || !accepted) return null;
  return <AuthenticatedDebate />;
}

function AuthenticatedDebate() {
  const [preferences, setPreferences] = useState<DebatePreferences>(DEFAULT_DEBATE_PREFERENCES);
  const [stage, setStage] = useState<'setup' | 'check' | 'room'>('setup');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const backToSetup = () => {
    setStage('setup');
    setStream(null);
  };
  if (stage === 'setup') return <DebateSetup initial={preferences} onStart={(selected) => {
    setPreferences(selected);
    setStage('check');
  }} />;
  if (stage === 'check') return <PreDebateCheck preferences={preferences} onBack={backToSetup} onJoin={(ready) => {
    setStream(ready);
    setStage('room');
  }} />;
  if (!stream) return null;
  return <DebateRoom preferences={preferences} initialStream={stream} onChangePreferences={backToSetup} />;
}
