import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { ChatWindow } from './ChatWindow';

// Floating bottom-right chat entry point. Opens expanded by default so the
// assistant is front-and-center for the demo. Collapsed (after minimizing):
// a navy bubble button with an attention pulse + a brief "AI Assistant" tooltip.
export function ChatWidget() {
  // Open by default — the chat is the star of this demo, so it greets the
  // visitor immediately rather than hiding behind a launcher bubble.
  const [open, setOpen] = useState(true);
  // The launcher tooltip/pulse only matter once the user has minimized, so
  // they start off and re-arm in handleClose.
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulse, setPulse] = useState(false);

  // Clear any pending pulse/tooltip timers on unmount.
  const timersRef = useRef<number[]>([]);
  useEffect(() => () => timersRef.current.forEach(window.clearTimeout), []);

  const handleOpen = () => {
    setOpen(true);
    setShowTooltip(false);
    setPulse(false);
  };

  // On minimize, briefly draw the eye back to the launcher bubble.
  const handleClose = () => {
    setOpen(false);
    setShowTooltip(true);
    setPulse(true);
    timersRef.current.push(
      window.setTimeout(() => setShowTooltip(false), 3000),
      window.setTimeout(() => setPulse(false), 6000),
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open ? (
        <ChatWindow onClose={handleClose} />
      ) : (
        <div className="flex items-center gap-2.5">
          {/* Auto-fading tooltip to the left of the button */}
          <div
            className={cn(
              'pointer-events-none select-none rounded-full bg-white px-3 py-1.5 text-meta font-medium text-bc-gray-900 shadow-card transition-opacity duration-500',
              showTooltip ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!showTooltip}
          >
            AI Assistant
          </div>

          {/* Collapsed launcher button */}
          <button
            type="button"
            onClick={handleOpen}
            aria-label="Open Booking.com Assistant"
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full bg-bc-navy text-white shadow-widget transition-transform hover:scale-105 active:scale-95',
              pulse && 'animate-pulse-ring',
            )}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z"
                fill="currentColor"
              />
              <circle cx="9" cy="9" r="1.1" fill="#003580" />
              <circle cx="12" cy="9" r="1.1" fill="#003580" />
              <circle cx="15" cy="9" r="1.1" fill="#003580" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
