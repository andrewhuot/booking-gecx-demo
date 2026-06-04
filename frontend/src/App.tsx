import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDemoStore } from './store/demoStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoPlay } from './hooks/useAutoPlay';
import { useCXASAgent } from './hooks/useCXASAgent';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Homepage } from './components/pages/Homepage';
import { SearchResults } from './components/pages/SearchResults';
import { PropertyDetail } from './components/pages/PropertyDetail';
import { Confirmation } from './components/pages/Confirmation';
import { ChatWidget } from './components/agent/ChatWidget';
import { VoiceModal } from './components/voice/VoiceModal';
import { MobileFrame } from './components/mobile/MobileFrame';
import { PresenterPanel } from './components/presenter/PresenterPanel';

function CurrentView() {
  const view = useDemoStore((s) => s.view);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {view === 'home' && <Homepage />}
        {view === 'search' && <SearchResults />}
        {view === 'property' && <PropertyDetail />}
        {view === 'confirmation' && <Confirmation />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useKeyboardShortcuts();
  useAutoPlay();
  const channel = useDemoStore((s) => s.channel);

  // Probe the backend once on load so the presenter's live-mode toggle reflects
  // whether the CXAS bridge is actually reachable (lights the liveAvailable dot).
  const setLiveAvailable = useDemoStore((s) => s.setLiveAvailable);
  const { checkHealth } = useCXASAgent();
  useEffect(() => {
    let cancelled = false;
    void checkHealth().then((ok) => {
      if (!cancelled) setLiveAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [checkHealth, setLiveAvailable]);

  return (
    <div className="flex min-h-full flex-col bg-bc-gray-100">
      <Header />
      <main className="flex-1">
        <CurrentView />
      </main>
      <Footer />

      {/* Agent channels — the desktop chat widget is the default surface, but it
          steps aside when a voice call or the mobile frame takes over the demo. */}
      {channel !== 'voice' && channel !== 'mobile' && <ChatWidget />}
      {channel === 'voice' && <VoiceModal />}
      {channel === 'mobile' && <MobileFrame />}

      {/* Hidden presenter controls */}
      <PresenterPanel />
    </div>
  );
}
