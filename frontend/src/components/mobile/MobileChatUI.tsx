import { useEffect, useRef } from 'react';
import { useDemoStore } from '../../store/demoStore';
import { MessageList } from '../agent/MessageList';

// The in-app mobile chat (full-screen within the device frame). Reuses the
// shared <MessageList /> for the conversation body so bubbles + cards render
// identically to the desktop chat; we only supply the mobile chrome.
export function MobileChatUI() {
  const messages = useDemoStore((s) => s.messages);
  const isTyping = useDemoStore((s) => s.isTyping);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin to the newest message / typing indicator as the chat grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div className="flex h-full w-full flex-col bg-bc-gray-100">
      {/* Chat header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-bc-gray-200 bg-bc-navy px-3 pb-2.5 pt-1 text-white">
        <span
          className="flex h-7 w-7 items-center justify-center text-xl text-white/80"
          aria-hidden
        >
          ‹
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-base"
          aria-hidden
        >
          ✦
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-bold">Booking.com ✦</div>
          <div className="truncate text-[10px] text-white/70">
            Assistant • online
          </div>
        </div>
      </header>

      {/* Conversation — shared rendering */}
      <div
        ref={scrollRef}
        className="thin-scrollbar flex-1 overflow-y-auto px-3 py-3"
      >
        <MessageList />
      </div>

      {/* Decorative input bar */}
      <div className="flex shrink-0 items-center gap-2 border-t border-bc-gray-200 bg-white px-3 py-2">
        <div className="flex flex-1 items-center rounded-full border border-bc-gray-200 bg-bc-gray-100 px-3.5 py-2 text-[13px] text-bc-gray-500">
          Message…
        </div>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bc-blue text-white"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12h14M12 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
