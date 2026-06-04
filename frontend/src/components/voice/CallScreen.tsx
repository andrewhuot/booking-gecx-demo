import { motion } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { useTimer } from '../../hooks/useTimer';
import { cn } from '../../lib/cn';
import { AudioVisualizer } from './AudioVisualizer';
import { CallTranscript } from './CallTranscript';

interface CallScreenProps {
  // Agent is currently speaking (drives the orb + visualizer animation).
  speaking: boolean;
  // Whether speech synthesis is available; shows a subtle caption fallback note.
  speechSupported: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
}

// Mute / mic icon.
function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        fill="currentColor"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {muted && (
        <path
          d="M4 4l16 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// End-call (handset) icon.
function HangUpIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 13.5c5-4.5 11.5-4.5 17 0 .7.6.8 1.6.3 2.4l-1.2 1.7c-.5.7-1.4.9-2.1.5l-2.3-1.3c-.6-.3-.9-.9-.9-1.6v-1.2c-2.1-.8-4.3-.8-6.4 0v1.2c0 .7-.3 1.3-.9 1.6l-2.3 1.3c-.7.4-1.6.2-2.1-.5L1.9 15.9c-.5-.8-.4-1.8.3-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

// The voice call layout: avatar/orb up top with pulsing rings, status + timer,
// the live transcript in the middle, and call controls along the bottom.
export function CallScreen({
  speaking,
  speechSupported,
  muted,
  onToggleMute,
  onHangUp,
}: CallScreenProps) {
  const capability = useDemoStore((s) => s.capability);
  const elapsed = useTimer();

  const status = speaking ? 'Speaking…' : 'Connected';

  return (
    <div className="flex h-full w-full max-w-md flex-col items-center px-6 pb-8 pt-12 sm:pt-16">
      {/* Avatar orb with breathing concentric rings */}
      <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute rounded-full border border-bc-blue/40"
            initial={{ width: 96, height: 96, opacity: 0 }}
            animate={
              speaking
                ? { width: [96, 168], height: [96, 168], opacity: [0.5, 0] }
                : { width: 112, height: 112, opacity: 0.18 }
            }
            transition={
              speaking
                ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: i * 0.6,
                  }
                : { duration: 0.6 }
            }
          />
        ))}
        <motion.div
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-bc-blue to-bc-navy text-4xl text-white shadow-[0_0_40px_rgba(0,113,194,0.5)]"
          animate={speaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={
            speaking
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.4 }
          }
        >
          <span aria-hidden>✦</span>
        </motion.div>
      </div>

      {/* Identity + status */}
      <div className="mt-6 text-center">
        <h2 className="text-xl font-bold text-white">Booking.com Assistant</h2>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-sm text-white/60">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              speaking ? 'bg-bc-blue' : 'bg-bc-green',
            )}
          />
          <span>{status}</span>
          <span className="text-white/30">•</span>
          <span className="tabular-nums">{elapsed}</span>
        </div>
        {capability && (
          <div className="mt-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-bc-yellow">
            {capability}
          </div>
        )}
      </div>

      {/* Waveform */}
      <div className="mt-6 h-14 w-full">
        <AudioVisualizer active={speaking} className="h-full" />
      </div>

      {/* Live transcript */}
      <div className="mt-4 min-h-0 w-full flex-1 overflow-hidden rounded-card bg-white/[0.04] p-2">
        <CallTranscript />
      </div>

      {!speechSupported && (
        <p className="mt-2 text-center text-[11px] text-white/35">
          Captions only — audio playback isn’t available in this browser.
        </p>
      )}

      {/* Controls */}
      <div className="mt-6 flex shrink-0 items-center justify-center gap-8">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={muted}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
            muted ? 'bg-white/90 text-bc-navy' : 'bg-white/10 hover:bg-white/20',
          )}
        >
          <MicIcon muted={muted} />
        </button>
        <button
          type="button"
          onClick={onHangUp}
          aria-label="End call"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-bc-red text-white shadow-[0_4px_24px_rgba(204,0,0,0.5)] transition-transform hover:scale-105 active:scale-95"
        >
          <HangUpIcon />
        </button>
      </div>
    </div>
  );
}
