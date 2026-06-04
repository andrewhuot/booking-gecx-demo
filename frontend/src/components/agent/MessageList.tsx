import { useDemoStore } from '../../store/demoStore';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import type { RenderedMessage } from '../../lib/types';

// Turns a system marker like "PRIMARY BOOKING COMPLETE — UPSELL PHASE" into a
// short pill label such as "Upsell phase".
function systemLabel(text: string): string {
  const tail = text.includes('—') ? text.split('—').pop() ?? text : text;
  const cleaned = tail.toLowerCase().trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function SystemDivider({ message }: { message: RenderedMessage }) {
  return (
    <div className="flex items-center justify-center py-1 animate-msg-in">
      <span className="rounded-full bg-bc-gray-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-bc-gray-500">
        {systemLabel(message.text)}
      </span>
    </div>
  );
}

// Renders the conversation so far plus the typing indicator. System messages
// become subtle phase dividers; everything else is a ChatBubble.
export function MessageList() {
  const messages = useDemoStore((s) => s.messages);
  const isTyping = useDemoStore((s) => s.isTyping);

  return (
    <div className="flex flex-col gap-3">
      {messages.map((m) =>
        m.role === 'system' ? (
          <SystemDivider key={m.id} message={m} />
        ) : (
          <ChatBubble key={m.id} message={m} />
        ),
      )}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
