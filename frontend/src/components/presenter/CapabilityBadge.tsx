import { motion, AnimatePresence } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';

// Prominent indicator of the GECX capability currently being demonstrated.
// Glowing pill on the dark presenter panel; animates whenever the capability
// string changes so the presenter (and audience) can track the live narrative.
export function CapabilityBadge() {
  const capability = useDemoStore((s) => s.capability);
  const hasCapability = capability.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Capability
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={hasCapability ? capability : '__empty__'}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={cn(
            'inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-sm font-bold',
            hasCapability
              ? 'bg-bc-yellow text-bc-navy-dark shadow-[0_0_18px_rgba(254,186,2,0.5)]'
              : 'bg-slate-800 text-slate-500',
          )}
        >
          {hasCapability && (
            <span className="h-2 w-2 rounded-full bg-bc-navy-dark/70" aria-hidden />
          )}
          {hasCapability ? capability : '—'}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
