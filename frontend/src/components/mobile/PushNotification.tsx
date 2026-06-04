import { motion } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { MELISSA_SCRIPT } from '../../data/melissaScript';

// iOS-style push-notification banner that slides down from the top of the
// device frame during the 'notification' stage. Tapping it opens the in-app
// chat (splash → chat). Content comes from the Melissa script.
export function PushNotification() {
  const openMobileChat = useDemoStore((s) => s.openMobileChat);
  const { appName, title, body, timestamp } = MELISSA_SCRIPT.notification;

  return (
    <motion.button
      type="button"
      onClick={openMobileChat}
      aria-label={`Open notification: ${title}`}
      className="absolute inset-x-3 top-14 z-30 flex items-start gap-3 rounded-[20px] border border-white/60 bg-white/80 p-3 text-left shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl active:scale-[0.98]"
      initial={{ y: -120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    >
      {/* App icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-bc-navy text-xl font-extrabold text-white">
        <span aria-hidden>B.</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-bc-gray-700">
            {appName}
          </span>
          <span className="shrink-0 text-[11px] text-bc-gray-500">
            {timestamp}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[13px] font-bold text-bc-gray-900">
          {title}
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-bc-gray-700 line-clamp-2">
          {body}
        </p>
      </div>
    </motion.button>
  );
}
