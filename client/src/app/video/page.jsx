'use client';
import { useAuth } from '@/hooks/useAuth';
import {
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

const PLACEHOLDER =
  "url('https://m.gettywallpapers.com/wp-content/uploads/2023/06/Dark-Black-Profile-Picture.jpg') no-repeat center center / cover";

const DEMO_MSGS = [
  { id: 1, sender: 'other', text: 'Hey! Can you hear me okay? 🎧' },
  { id: 2, sender: 'me', text: 'Loud and clear! 👋' },
  { id: 3, sender: 'other', text: "Great, let's get started." },
];

/* ── Chat Body ─────────────────────────────── */
function ChatBody({ msgs }) {
  const endRef = useRef(null);
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
function ChatInputRow({ onSend }) {
  const [val, setVal] = useState('');
  const send = () => {
    if (!val.trim()) return;
    onSend?.(val.trim());
    setVal('');
  };
  return (
    <div className="flex items-end gap-2.5 px-3 pb-4 pt-2.5 border-t border-white/7 bg-[#0f1219] shrink-0">
      <textarea
        className="flex-1 px-3.5 py-2.5 rounded-[22px] bg-white/5 border border-white/8
          text-[#dde2ee] text-sm leading-snug outline-none resize-none
          min-h-[75px] max-h-[150px] placeholder:text-white/35
          transition-all duration-200
          focus:bg-white/8 focus:border-[rgba(0,229,192,0.38)] focus:shadow-[0_0_0_3px_rgba(0,229,192,0.07)]"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Message…"
        rows={1}
      />
      <button
        onClick={send}
        aria-label="Send"
        className="w-[42px] h-[42px] rounded-full border-none cursor-pointer shrink-0
          bg-gradient-to-br from-[#00e5c0] to-[#00aaff]
          shadow-[0_4px_14px_rgba(0,229,192,0.28)]
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 hover:shadow-[0_6px_22px_rgba(0,229,192,0.45)]
          active:scale-90"
      >
        <Send size={15} color="#fff" />
      </button>
    </div>
  );
}

/* ── Main Page ─────────────────────────────── */
export default function VideoPage() {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { toggleMic, toggleCamera } = useWebRTC(localRef, remoteRef);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState(DEMO_MSGS);
  const [unread, setUnread] = useState(2);

  const openChat = () => {
    setChatOpen(true);
    setUnread(0);
  };
  const closeChat = () => setChatOpen(false);
  const handleSend = (text) =>
    setMsgs((prev) => [...prev, { id: Date.now(), sender: 'me', text }]);

  if (!isAuthenticated()) {
    router.push('/login');
    return null;
  }

  return (
    <>
      {/* PAGE */}
      <div className="relative flex flex-col h-[calc(100vh-64px)] bg-[#07090e] overflow-hidden font-[DM_Sans,sans-serif]">
        {/* BODY */}
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* ── STAGE ── */}
          <section
            className={`flex-1 flex flex-col gap-3.5 p-4.5 min-w-0 transition-all duration-300
              ${chatOpen ? 'blur-sm brightness-50 pointer-events-none' : ''}`}
          >
            {/* VIDEO GRID */}
            <div
              className="grid grid-cols-2 gap-3.5 flex-1 min-h-0
                            max-md:grid-cols-1 max-md:grid-rows-2 max-md:gap-2.5"
            >
              {/* Remote tile */}
              <div
                className="relative rounded-[22px] overflow-hidden bg-[#0f1219]
                              border border-white/7 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
              >
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover block"
                  style={{ background: PLACEHOLDER }}
                />
                {/* gloss overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
                <span
                  className="absolute top-3 left-3 text-[0.68rem] font-semibold tracking-[0.1em] uppercase
                                 text-white/65 bg-[rgba(7,9,14,0.55)] backdrop-blur-[10px]
                                 px-2.5 py-1 rounded-full border border-white/9"
                >
                  Remote
                </span>
              </div>

              {/* Local tile — teal glow ring */}
              <div
                className="relative rounded-[22px] overflow-hidden bg-[#0f1219]
                              border border-white/7
                              shadow-[0_0_0_2px_rgba(0,229,192,0.2),0_12px_40px_rgba(0,0,0,0.55)]"
              >
                <video
                  ref={localRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover block"
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
            <div className="flex items-center justify-center gap-3 pb-1">
              {/* Mic */}
              <button
                onClick={() => {
                  toggleMic();
                  setMicOn((v) => !v);
                }}
                title={micOn ? 'Mute' : 'Unmute'}
                className={`relative w-[52px] h-[52px] rounded-full border cursor-pointer
                  flex items-center justify-center outline-none
                  backdrop-blur-[8px] transition-all duration-200
                  active:scale-[0.87]
                  max-md:w-[46px] max-md:h-[46px]
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
                  setCamOn((v) => !v);
                }}
                title={camOn ? 'Camera off' : 'Camera on'}
                className={`relative w-[52px] h-[52px] rounded-full border cursor-pointer
                  flex items-center justify-center outline-none
                  backdrop-blur-[8px] transition-all duration-200
                  active:scale-[0.87]
                  max-md:w-[46px] max-md:h-[46px]
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
                className="relative w-[58px] h-[58px] rounded-full border-none cursor-pointer
                  flex items-center justify-center outline-none
                  bg-[#ff3b5c] shadow-[0_4px_22px_rgba(255,59,92,0.45)]
                  transition-all duration-200
                  hover:scale-110 hover:bg-[#ff1a3a] hover:shadow-[0_8px_30px_rgba(255,59,92,0.6)]
                  active:scale-[0.87]
                  max-md:w-[52px] max-md:h-[52px]"
              >
                <PhoneOff size={21} color="#fff" className="rotate-[135deg]" />
              </button>

              {/* Chat toggle — only visible on mobile (md:hidden) */}
              <button
                onClick={openChat}
                title="Chat"
                className="relative lg:hidden w-[52px] h-[52px] rounded-full border-none cursor-pointer
                  flex items-center justify-center outline-none
                  bg-gradient-to-br from-[#00e5c0] to-[#00aaff]
                  shadow-[0_4px_22px_rgba(0,229,192,0.32)]
                  transition-all duration-200
                  hover:scale-110 hover:shadow-[0_8px_30px_rgba(0,229,192,0.48)]
                  active:scale-[0.87]
                  max-md:w-[46px] max-md:h-[46px]"
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
          <aside className="hidden lg:flex flex-col w-[300px] min-w-[250px] shrink-0 border-l border-white/7 bg-[#0f1219]">
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
          className={`md:hidden fixed inset-0 z-[90] bg-[rgba(7,9,14,0.72)] backdrop-blur-[8px]
            transition-opacity duration-300
            ${chatOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        />

        {/* ── MOBILE DRAWER ── */}
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-[100]
            flex flex-col h-[68svh]
            bg-[#0f1219] rounded-t-[26px]
            border border-b-0 border-white/9
            shadow-[0_-18px_60px_rgba(0,0,0,0.65)]
            overflow-hidden
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
              className="w-[33px] h-[33px] rounded-full
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
    </>
  );
}
