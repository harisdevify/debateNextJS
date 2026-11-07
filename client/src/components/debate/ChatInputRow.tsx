"use client";
import { useState } from "react";
import { Send } from "lucide-react";

export function ChatInputRow({
  onSend,
}: {
  onSend: (text: string) => Promise<boolean>;
}) {
  const [val, setVal] = useState("");
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!val.trim() || sending) return;
    setSending(true);
    try {
      if (await onSend(val.trim())) setVal("");
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="flex min-w-0 shrink-0 items-end gap-2 border-t border-white/10 bg-[#101815] px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <textarea
        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2
          text-[#dde2ee] text-sm leading-snug outline-none resize-none
          min-h-11 max-h-[120px] placeholder:text-white/35
          transition-all duration-200
          focus:border-primary/40 focus:bg-white/8 focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="Chat message"
        maxLength={1000}
        disabled={sending}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Message…"
        rows={1}
      />
      <button
        onClick={() => void send()}
        disabled={sending || !val.trim()}
        aria-label="Send message"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none
          bg-primary text-background disabled:cursor-not-allowed disabled:opacity-40
          transition-colors duration-150 hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Send size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
