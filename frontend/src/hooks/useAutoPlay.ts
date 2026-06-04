import { useEffect } from 'react';
import { useDemoStore, SCRIPTS } from '../store/demoStore';

// When auto-play is on, advance through the active script automatically using
// each message's delay (plus a natural pause between turns).
export function useAutoPlay() {
  const autoPlay = useDemoStore((s) => s.autoPlay);
  const mode = useDemoStore((s) => s.mode);
  const scenario = useDemoStore((s) => s.scenario);
  const messageIndex = useDemoStore((s) => s.messageIndex);
  const isTyping = useDemoStore((s) => s.isTyping);
  const channel = useDemoStore((s) => s.channel);
  const mobileStage = useDemoStore((s) => s.mobileStage);

  useEffect(() => {
    if (!autoPlay || mode === 'live' || isTyping) return;

    // Drive the mobile intro sequence automatically too.
    if (channel === 'mobile') {
      if (mobileStage === 'home') {
        const t = window.setTimeout(() => useDemoStore.getState().triggerNotification(), 1500);
        return () => window.clearTimeout(t);
      }
      if (mobileStage === 'notification') {
        const t = window.setTimeout(() => useDemoStore.getState().openMobileChat(), 2200);
        return () => window.clearTimeout(t);
      }
      if (mobileStage !== 'chat' && mobileStage !== 'confirmation') return;
    }

    const script = SCRIPTS[scenario];
    if (messageIndex >= script.length) return;

    const next = script[messageIndex];
    // User messages appear quickly; agent turns wait their delay first (handled
    // inside advance), so here we just pace the cadence between commits.
    const pause = next.role === 'user' ? 700 : 500;
    const t = window.setTimeout(() => useDemoStore.getState().advance(), pause);
    return () => window.clearTimeout(t);
  }, [autoPlay, mode, scenario, messageIndex, isTyping, channel, mobileStage]);
}
