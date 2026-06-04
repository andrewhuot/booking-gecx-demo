import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDemoStore } from '../../store/demoStore';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { CallScreen } from './CallScreen';

// Full-screen voice-call modal for the David scenario. Owns the message
// subscription and the speaking-trigger effect: when a new agent line with
// `isVoice` arrives (in scripted voice mode) it is spoken aloud, and the
// `speaking` flag drives the on-screen orb + waveform.
export function VoiceModal() {
  const channel = useDemoStore((s) => s.channel);
  const mode = useDemoStore((s) => s.mode);
  const messages = useDemoStore((s) => s.messages);
  const setChannel = useDemoStore((s) => s.setChannel);
  const resetScenario = useDemoStore((s) => s.resetScenario);

  const { speak, cancel, speaking, supported } = useSpeechSynthesis();
  const [muted, setMuted] = useState(false);

  // Track the last agent line we've already spoken so re-renders don't repeat it.
  const lastSpokenIdRef = useRef<string | null>(null);

  // Speak newly-arrived voice agent messages (scripted voice mode only).
  useEffect(() => {
    if (channel !== 'voice' || mode !== 'scripted') return;

    const lastAgentVoice = [...messages]
      .reverse()
      .find((m) => m.role === 'agent' && m.isVoice);

    if (!lastAgentVoice) return;
    if (lastAgentVoice.id === lastSpokenIdRef.current) return;

    lastSpokenIdRef.current = lastAgentVoice.id;
    if (!muted) speak(lastAgentVoice.text);
  }, [messages, channel, mode, muted, speak]);

  // Stop any speech if the modal closes / channel changes.
  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  const handleHangUp = () => {
    cancel();
    resetScenario();
    setChannel('none');
  };

  const handleToggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) cancel();
      return next;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="voice-modal"
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, #003580 0%, #00224F 55%, #001536 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        role="dialog"
        aria-modal="true"
        aria-label="Voice call with Booking.com Assistant"
      >
        <motion.div
          className="flex h-full w-full justify-center"
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <CallScreen
            speaking={speaking}
            speechSupported={supported}
            muted={muted}
            onToggleMute={handleToggleMute}
            onHangUp={handleHangUp}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
