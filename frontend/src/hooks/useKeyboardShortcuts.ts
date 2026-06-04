import { useEffect } from 'react';
import { useDemoStore } from '../store/demoStore';
import type { ScenarioId } from '../lib/types';

// Global keyboard shortcuts for driving the demo (see PROMPT shortcut table).
export function useKeyboardShortcuts() {
  const advance = useDemoStore((s) => s.advance);
  const togglePresenter = useDemoStore((s) => s.togglePresenter);
  const setScenario = useDemoStore((s) => s.setScenario);
  const resetScenario = useDemoStore((s) => s.resetScenario);
  const toggleAutoPlay = useDemoStore((s) => s.toggleAutoPlay);
  const channel = useDemoStore((s) => s.channel);
  const mobileStage = useDemoStore((s) => s.mobileStage);
  const triggerNotification = useDemoStore((s) => s.triggerNotification);
  const openMobileChat = useDemoStore((s) => s.openMobileChat);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Toggle presenter panel: Cmd/Ctrl + Shift + P
      if (mod && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        togglePresenter();
        return;
      }

      // Toggle auto-play: Cmd/Ctrl + Shift + A
      if (mod && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        toggleAutoPlay();
        return;
      }

      // Scenario switches: Cmd/Ctrl + 1/2/3, reset on 0
      if (mod && !e.shiftKey) {
        const map: Record<string, ScenarioId> = { '1': 'rachel', '2': 'david', '3': 'melissa' };
        if (map[e.key]) {
          e.preventDefault();
          setScenario(map[e.key]);
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          resetScenario();
          return;
        }
      }

      // Spacebar advances — but never when typing in an input/textarea.
      if (e.key === ' ' || e.code === 'Space') {
        const target = e.target as HTMLElement;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
        e.preventDefault();
        // Mobile scenario: spacebar drives the notification → chat sequence first.
        if (channel === 'mobile') {
          if (mobileStage === 'home') {
            triggerNotification();
            return;
          }
          if (mobileStage === 'notification') {
            openMobileChat();
            return;
          }
        }
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    advance,
    togglePresenter,
    setScenario,
    resetScenario,
    toggleAutoPlay,
    channel,
    mobileStage,
    triggerNotification,
    openMobileChat,
  ]);
}
