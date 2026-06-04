import { AnimatePresence, motion } from 'framer-motion';
import { useDemoStore } from './store/demoStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoPlay } from './hooks/useAutoPlay';
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

  return (
    <div className="flex min-h-full flex-col bg-bc-gray-100">
      <Header />
      <main className="flex-1">
        <CurrentView />
      </main>
      <Footer />

      {/* Agent channels — chat widget is always available on desktop */}
      <ChatWidget />
      {channel === 'voice' && <VoiceModal />}
      {channel === 'mobile' && <MobileFrame />}

      {/* Hidden presenter controls */}
      <PresenterPanel />
    </div>
  );
}
