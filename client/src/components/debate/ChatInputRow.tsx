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
    <div className="flex items-end gap-2.5 px-3 pb-4 pt-2.5 border-t border-white/7 bg-[#0f1219] shrink-0">
      <textarea
        className="flex-1 px-3.5 py-2.5 rounded-[22px] bg-white/5 border border-white/8
          text-[#dde2ee] text-sm leading-snug outline-none resize-none
          min-h-[75px] max-h-[150px] placeholder:text-white/35
          transition-all duration-200
          focus:bg-white/8 focus:border-[rgba(0,229,192,0.38)] focus:shadow-[0_0_0_3px_rgba(0,229,192,0.07)]"
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
        onClick={send}
        disabled={sending || !val.trim()}
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
