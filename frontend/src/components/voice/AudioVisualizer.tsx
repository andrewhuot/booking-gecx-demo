import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface AudioVisualizerProps {
  // Whether the agent is currently speaking. Bars animate when true.
  active: boolean;
  className?: string;
}

// Relative heights give the waveform an organic, voice-like silhouette
// (tall in the middle, tapering at the edges).
const BAR_PROFILE = [0.35, 0.55, 0.78, 0.62, 1, 0.7, 0.88, 0.5, 0.72, 0.42];

// A horizontal row of bars that breathe while the agent speaks and settle into
// a calm idle pulse otherwise. Pure decoration driven by the `active` flag.
export function AudioVisualizer({ active, className }: AudioVisualizerProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-[5px]', className)}
      aria-hidden
    >
      {BAR_PROFILE.map((peak, i) => {
        const idleHeight = 6;
        const maxHeight = 4 + peak * 44;
        return (
          <motion.span
            key={i}
            className="w-[5px] rounded-full bg-gradient-to-t from-bc-blue to-sky-300"
            initial={false}
            animate={
              active
                ? { height: [idleHeight, maxHeight, idleHeight + 4] }
                : { height: idleHeight }
            }
            transition={
              active
                ? {
                    duration: 0.5 + (i % 4) * 0.12,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                    delay: i * 0.04,
                  }
                : { duration: 0.3, ease: 'easeOut' }
            }
            style={{ height: idleHeight }}
          />
        );
      })}
    </div>
  );
}
