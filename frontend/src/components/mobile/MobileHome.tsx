import { motion } from 'framer-motion';

// Phone idle / lock screen shown during the 'home' stage, before the push
// notification fires. Large clock over a soft gradient, with a subtle hint that
// something is about to arrive.
export function MobileHome() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#1b2a4a] via-[#24365c] to-[#3a4f7a] text-white">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-bc-blue/30 blur-3xl"
        aria-hidden
      />

      {/* Clock cluster */}
      <div className="relative z-10 mt-24 flex flex-col items-center">
        <div className="text-sm font-medium text-white/80">
          Wednesday, June 4
        </div>
        <div className="mt-1 text-7xl font-light tabular-nums tracking-tight">
          9:41
        </div>
      </div>

      {/* Idle hint */}
      <motion.div
        className="relative z-10 mb-12 flex flex-col items-center gap-2 px-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/15 backdrop-blur">
          <span className="text-xl" aria-hidden>
            🔔
          </span>
        </div>
        <p className="text-[13px] leading-snug text-white/60">
          A new suggestion from Booking.com is on its way…
        </p>
      </motion.div>

      {/* Home indicator */}
      <div
        className="absolute bottom-2 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-white/50"
        aria-hidden
      />
    </div>
  );
}
