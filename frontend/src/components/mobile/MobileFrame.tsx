import { AnimatePresence } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import { AppSplash } from './AppSplash';
import { MobileHome } from './MobileHome';
import { MobileChatUI } from './MobileChatUI';
import { PushNotification } from './PushNotification';

// iOS status-bar glyphs (signal / wifi / battery) for the top-right cluster.
function StatusGlyphs() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {/* Signal bars */}
      <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
        <rect x="0" y="7" width="3" height="4" rx="0.5" fill="currentColor" />
        <rect x="4.5" y="5" width="3" height="6" rx="0.5" fill="currentColor" />
        <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" fill="currentColor" />
        <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill="currentColor" />
      </svg>
      {/* Wifi */}
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <path
          d="M8 10.5l2-2.4a3 3 0 0 0-4 0l2 2.4Z"
          fill="currentColor"
        />
        <path
          d="M3.2 5.6a7 7 0 0 1 9.6 0M5.4 8a4 4 0 0 1 5.2 0"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {/* Battery */}
      <div className="flex items-center gap-0.5">
        <div className="relative h-[11px] w-[22px] rounded-[3px] border border-current opacity-90">
          <div className="absolute inset-[1.5px] right-[5px] rounded-[1px] bg-current" />
        </div>
        <div className="h-[4px] w-[1.5px] rounded-r bg-current opacity-60" />
      </div>
    </div>
  );
}

// iOS status bar: time on the left, signal/wifi/battery on the right. The text
// tone adapts to light vs dark content behind it.
function StatusBar({ dark }: { dark: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between px-7 pt-1',
        dark ? 'text-white' : 'text-bc-gray-900',
      )}
    >
      <span className="text-[14px] font-semibold tabular-nums">9:41</span>
      <StatusGlyphs />
    </div>
  );
}

// Maps the current mobile stage to the screen that fills the device viewport.
function MobileStageView() {
  const stage = useDemoStore((s) => s.mobileStage);

  switch (stage) {
    case 'home':
    case 'notification':
      return <MobileHome />;
    case 'splash':
      return <AppSplash />;
    case 'chat':
    case 'confirmation':
      return <MobileChatUI />;
    default:
      return <MobileHome />;
  }
}

// Centered, realistic iPhone device frame containing the mobile sub-views. The
// frame stays fixed; the inner screen swaps based on `mobileStage`, and the push
// notification overlays the top during the 'notification' stage.
export function MobileFrame() {
  const stage = useDemoStore((s) => s.mobileStage);

  // Home/notification stages have dark wallpaper → light status-bar text.
  const darkStatus = stage === 'home' || stage === 'notification' || stage === 'splash';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      {/* Device frame */}
      <div className="relative h-[844px] max-h-[92vh] w-[390px] max-w-[92vw] shrink-0 rounded-[54px] bg-black p-[14px] shadow-[0_30px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <div className="absolute -left-[3px] top-[170px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <div className="absolute -left-[3px] top-[230px] h-12 w-[3px] rounded-l bg-neutral-800" aria-hidden />
        <div className="absolute -right-[3px] top-[190px] h-16 w-[3px] rounded-r bg-neutral-800" aria-hidden />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-black">
          <StatusBar dark={darkStatus} />

          {/* Dynamic Island */}
          <div
            className="absolute left-1/2 top-2.5 z-30 h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black"
            aria-hidden
          />

          {/* App viewport */}
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <MobileStageView key={stage === 'confirmation' ? 'chat' : stage} />
            </AnimatePresence>
          </div>

          {/* Push notification overlay */}
          <AnimatePresence>
            {stage === 'notification' && <PushNotification />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
