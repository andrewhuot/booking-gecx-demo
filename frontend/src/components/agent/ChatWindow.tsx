import { useCallback, useEffect, useRef, useState } from 'react';
import { useDemoStore } from '../../store/demoStore';
import { useCXASAgent } from '../../hooks/useCXASAgent';
import { MessageList } from './MessageList';
import { QuickReplyChips } from './QuickReplyChips';
import { CHAT_SUBMIT_EVENT, type ChatSubmitEventDetail } from './chatSubmitEvent';

interface ChatWindowProps {
  onClose: () => void;
}

const WELCOME_TEXT =
  "Hi! I'm your Booking.com assistant. I can help you find the perfect stay, manage a booking, or answer questions. What are you looking for?";

// The expanded desktop chat window: large, docked, and prominent because it is
// the centerpiece of the July 4 demo flow.
export function ChatWindow({ onClose }: ChatWindowProps) {
  const messages = useDemoStore((s) => s.messages);
  const isTyping = useDemoStore((s) => s.isTyping);
  const mode = useDemoStore((s) => s.mode);
  const scenario = useDemoStore((s) => s.scenario);
  const advance = useDemoStore((s) => s.advance);
  const pushUserMessage = useDemoStore((s) => s.pushUserMessage);
  const pushAgentMessage = useDemoStore((s) => s.pushAgentMessage);
  const setTyping = useDemoStore((s) => s.setTyping);
  const submitScriptedTurn = useDemoStore((s) => s.submitScriptedTurn);
  const { sendMessage } = useCXASAgent();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasUserMessage = messages.some((m) => m.role === 'user');
  const showBuiltInWelcome = messages.length === 0;

  // Keep the conversation pinned to the latest message / typing indicator.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Send the chip/typed text through the live backend (live mode only).
  const submitLive = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushUserMessage(trimmed);
    setTyping(true);
    try {
      const result = await sendMessage(trimmed, 'chat');
      pushAgentMessage(result);
    } catch {
      pushAgentMessage({
        role: 'agent',
        text: 'Sorry, I had trouble connecting. (Live mode requires the backend.)',
        delay: 0,
        capability: 'Live',
      });
    } finally {
      setTyping(false);
    }
  }, [pushAgentMessage, pushUserMessage, sendMessage, setTyping]);

  const submitMessage = useCallback(
    async (text: string) => {
      if (mode === 'live') {
        await submitLive(text);
        return;
      }
      if (scenario === 'july4') {
        submitScriptedTurn(text);
        return;
      }
      advance();
    },
    [advance, mode, scenario, submitLive, submitScriptedTurn],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ChatSubmitEventDetail>).detail;
      if (detail?.text) void submitMessage(detail.text);
    };
    window.addEventListener(CHAT_SUBMIT_EVENT, handler);
    return () => window.removeEventListener(CHAT_SUBMIT_EVENT, handler);
  }, [submitMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft('');
    void submitMessage(text);
  };

  const switchToVoice = () => {
    useDemoStore.getState().setScenario('david');
    useDemoStore.getState().setChannel('voice');
  };

  return (
    <div
      data-testid="booking-chat-window"
      role="dialog"
      aria-label="Booking.com Assistant chat"
      className="flex h-[720px] max-h-[calc(100vh-3rem)] min-h-[620px] w-[560px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card bg-white shadow-[0_20px_70px_rgba(0,0,0,0.28)] animate-widget-open"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between bg-bc-navy px-5 py-4 text-white">
        <div className="flex items-center gap-3.5">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl"
            aria-hidden
          >
            ✦
          </span>
          <div className="leading-tight">
            <div className="text-lg font-bold">Booking.com Assistant</div>
            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-white/75">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              ✦ Powered by Gemini
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize chat"
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </header>

      {/* Body */}
      <div
        ref={scrollRef}
        className="thin-scrollbar flex-1 space-y-4 overflow-y-auto bg-bc-gray-100 px-5 py-5"
      >
        {showBuiltInWelcome && (
          <div className="flex w-full items-start gap-2 animate-msg-in">
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bc-navy text-sm text-white"
              aria-hidden
            >
              ✦
            </div>
            <div className="max-w-[85%]">
              <div className="rounded-2xl rounded-tl-sm border border-bc-gray-200 bg-white px-4 py-3 text-[15px] leading-snug text-bc-gray-900 shadow-card">
                {WELCOME_TEXT}
              </div>
              <button
                type="button"
                onClick={switchToVoice}
                className="mt-1.5 pl-1 text-[11px] font-medium text-bc-blue hover:underline"
              >
                Prefer to talk? Call our AI assistant →
              </button>
            </div>
          </div>
        )}

        {/* Quick replies — only before the user has said anything */}
        {showBuiltInWelcome && !hasUserMessage && (
          <QuickReplyChips onSelect={(t) => void submitMessage(t)} />
        )}

        {/* Live conversation */}
        <MessageList />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-3 border-t border-bc-gray-200 bg-white px-4 py-3.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          aria-label="Type a message"
          className="flex-1 rounded-full border border-bc-gray-200 bg-bc-gray-100 px-5 py-3 text-[15px] text-bc-gray-900 outline-none transition-colors placeholder:text-bc-gray-500 focus:border-bc-blue focus:bg-white"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bc-blue text-white transition-colors hover:bg-bc-blue-dark"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M4 12h14M12 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
