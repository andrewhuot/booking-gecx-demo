import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { RenderedMessage } from '../../lib/types';

// A single transcript line. Agent lines read as the assistant speaking; user
// lines are right-aligned and lighter, like a live caption track.
function TranscriptLine({ message }: { message: RenderedMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('max-w-[88%]', isUser && 'text-right')}>
        <div
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wider',
            isUser ? 'text-sky-300/70' : 'text-bc-yellow/80',
          )}
        >
          {isUser ? 'David' : 'Assistant'}
        </div>
        <p
          className={cn(
            'mt-0.5 text-sm leading-snug',
            isUser ? 'text-white/70' : 'text-white',
          )}
        >
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}

// Live, scrolling transcript of the voice call, legible on the dark modal.
export function CallTranscript() {
  const messages = useDemoStore((s) => s.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest line in view as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="thin-scrollbar flex max-h-full w-full flex-col gap-3 overflow-y-auto px-1 py-2"
    >
      {messages.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">
          Listening…
        </p>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <TranscriptLine key={m.id} message={m} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
