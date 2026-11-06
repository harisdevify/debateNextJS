'use client';
import { ChatInputRow } from '@/components/debate/ChatInputRow';
import { PageState } from '@/components/ui/PageState';
import { DebateSetup } from '@/components/debate/DebateSetup';
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
function DebateRoom({ preferences, onChangePreferences }: { preferences: DebatePreferences; onChangePreferences: () => void }) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const router = useRouter();
  const {
    status,
    peerName,
    messages: msgs,
    sendMessage,
    findNext,
    reportPartner,
    blockPartner,
    toggleMic,
    toggleCamera,
    micOn,
    camOn,
    formalState,
    maySpeak,
    debateRemainingMs,
    turnRemainingMs,
  } = useDebateRoom(localRef, remoteRef, preferences);

  const formatRemaining = (value: number | null) => {
    if (value === null) return '--:--';
    const seconds = Math.ceil(value / 1000);
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };
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
    setChatOpen(true);
    setReadCount(msgs.length);
  };
  const closeChat = () => {
    setChatOpen(false);
    setReadCount(msgs.length);
  };
  const handleSend = (text: string) => sendMessage(text);
  const handleNext = () => {
    setReadCount(0);
    findNext();
  };

  return (
    <>
      {/* PAGE */}
      <div className="relative flex flex-col min-h-[calc(100svh-108px)] bg-[#07090e] lg:h-[calc(100dvh-108px)] lg:overflow-hidden font-[DM_Sans,sans-serif]">
        {/* BODY */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* ── STAGE ── */}
          <section
            className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 transition-all duration-300 sm:p-4 lg:gap-3.5
              ${chatOpen ? 'blur-sm brightness-50 pointer-events-none' : ''}`}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65">
              <span className="min-w-0 flex-1 truncate">{DEBATE_TOPICS.find((t) => t.value === preferences.topic)?.label} · {DEBATE_LANGUAGES.find((l) => l.value === preferences.language)?.label} · {DEBATE_MODES.find((m) => m.value === preferences.mode)?.label}</span>
              <button type="button" onClick={onChangePreferences} className="min-h-10 shrink-0 rounded-lg px-2 font-semibold text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40">Change preferences</button>
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
              className="grid min-h-[min(58svh,460px)] min-w-0 flex-1 grid-cols-1 grid-rows-2 gap-2.5 sm:min-h-[420px] sm:grid-cols-2 sm:grid-rows-1 sm:gap-3 lg:min-h-0"
            >
              {/* Remote tile */}
              <div
                className="relative min-h-0 overflow-hidden rounded-2xl bg-[#0f1219]
                              border border-white/7 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              >
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 block h-full w-full object-cover"
                  style={{ background: PLACEHOLDER }}
                />
                {/* gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />

                {/* status until a partner is connected */}
                {status !== 'connected' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 px-6 text-center">
                    <p className="text-sm text-white/70">{STATUS_TEXT[status]}</p>
                    {(status === 'peer-left' || status === 'blocked' || status === 'error') && (
                      <button
                        onClick={handleNext}
                        className="pressable rounded-full bg-primary px-5 py-2 text-sm font-bold text-background transition-colors hover:bg-primary-hover"
                      >
                        Find next partner
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
                className="relative min-h-0 overflow-hidden rounded-2xl bg-[#0f1219]
                              border border-white/7
                              shadow-[0_0_0_2px_rgba(0,229,192,0.2),0_12px_40px_rgba(0,0,0,0.55)]"
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

            {/* CONTROLS */}
            <div className="flex flex-wrap items-center justify-center gap-3 pb-2 pt-1">
              {/* Mic */}
              <button
                onClick={() => {
                  toggleMic();

                }}
                title={!maySpeak ? 'Wait for your speaking turn' : micOn ? 'Mute' : 'Unmute'}
                 disabled={!maySpeak || status === 'completed'}
                 aria-label={!maySpeak ? 'Microphone disabled until your turn' : micOn ? 'Mute microphone' : 'Unmute microphone'}
                className={`relative w-[52px] h-[52px] rounded-full border cursor-pointer
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
                className={`relative w-[52px] h-[52px] rounded-full border cursor-pointer
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

              {/* End Call */}
              <button
                onClick={() => router.push('/')}
                title="End Call"
                aria-label="End debate"
                className="relative w-[58px] h-[58px] rounded-full border-none cursor-pointer
                  flex items-center justify-center outline-none
                  bg-[#ff3b5c] shadow-[0_4px_22px_rgba(255,59,92,0.45)]
                  transition-all duration-200
                  hover:scale-110 hover:bg-[#ff1a3a] hover:shadow-[0_8px_30px_rgba(255,59,92,0.6)]
                  active:scale-[0.87]
                  min-w-12 min-h-12 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <PhoneOff size={21} color="#fff" className="rotate-[135deg]" />
              </button>

              {/* Chat toggle — only visible on mobile (md:hidden) */}
              <button
                onClick={openChat}
                title="Chat"
                aria-label={unread > 0 ? `Open chat, ${unread} unread messages` : 'Open chat'}
                aria-haspopup="dialog"
                aria-expanded={chatOpen}
                className="relative lg:hidden w-[52px] h-[52px] rounded-full border-none cursor-pointer
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
              </button>
            </div>
          </section>

          {/* ── DESKTOP CHAT ASIDE (hidden on mobile) ── */}
          <aside aria-label="Debate chat" className="hidden min-h-0 w-[min(32vw,340px)] min-w-[260px] shrink-0 flex-col border-l border-white/10 bg-[#0f1219] lg:flex">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b border-white/7 shrink-0">
              <div className="live-dot w-2 h-2 rounded-full bg-[#00e5c0] shadow-[0_0_9px_rgba(0,229,192,0.7)]" />
              <span className="text-[0.73rem] font-semibold tracking-[0.09em] uppercase text-white/40">
                Live Chat
              </span>
            </div>
            <ChatBody msgs={msgs} />
            <ChatInputRow onSend={handleSend} />
          </aside>
        </div>

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
  const [preferences, setPreferences] = useState<DebatePreferences | null>(null);
  const [lastPreferences, setLastPreferences] = useState<DebatePreferences>(DEFAULT_DEBATE_PREFERENCES);
  if (!preferences) {
    return <DebateSetup initial={lastPreferences} onStart={(selected) => {
      setLastPreferences(selected);
      setPreferences(selected);
    }} />;
  }
  return <DebateRoom preferences={preferences} onChangePreferences={() => setPreferences(null)} />;
}
