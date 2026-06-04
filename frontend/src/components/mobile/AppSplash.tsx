import { motion } from 'framer-motion';

// Brief Booking.com app splash shown during the 'splash' stage while the chat
// "loads". Navy field with the brand mark, mirroring a native app cold-start.
export function AppSplash() {
  return (
    <motion.div
      className="flex h-full w-full flex-col items-center justify-center bg-bc-navy"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-white shadow-widget">
          <span className="text-4xl font-extrabold text-bc-navy" aria-hidden>
            B.
          </span>
        </div>
        <div className="text-lg font-bold tracking-tight text-white">
          Booking.com
        </div>
      </motion.div>

      {/* Loading shimmer near the bottom, like a native launch screen */}
      <div className="absolute bottom-16 flex items-center gap-1.5" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 rounded-full bg-white/60 animate-dot-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
