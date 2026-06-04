import { motion, AnimatePresence } from 'framer-motion';
import { useDemoStore, SCRIPTS } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { DemoMode } from '../../lib/types';
import { CapabilityBadge } from './CapabilityBadge';
import { ScenarioSelector } from './ScenarioSelector';
import { ScriptPreview } from './ScriptPreview';

// Hidden presenter cockpit. Slides in from the right edge above everything
// (including the voice modal). Toggled via ⌘⇧P (the keyboard hook calls
// togglePresenter()); this component only renders + wires click handlers to
// store actions. Deliberately dark/slate so it never reads as the demo site.
export function PresenterPanel() {
  const presenterOpen = useDemoStore((s) => s.presenterOpen);
  const scenario = useDemoStore((s) => s.scenario);
  const messageIndex = useDemoStore((s) => s.messageIndex);
  const isTyping = useDemoStore((s) => s.isTyping);
  const autoPlay = useDemoStore((s) => s.autoPlay);
  const mode = useDemoStore((s) => s.mode);
  const liveAvailable = useDemoStore((s) => s.liveAvailable);

  const togglePresenter = useDemoStore((s) => s.togglePresenter);
  const toggleAutoPlay = useDemoStore((s) => s.toggleAutoPlay);
  const setMode = useDemoStore((s) => s.setMode);
  const advance = useDemoStore((s) => s.advance);
  const resetScenario = useDemoStore((s) => s.resetScenario);

  const finished = messageIndex >= SCRIPTS[scenario].length;
  const advanceDisabled = mode === 'live' || finished || isTyping;

  return (
    <AnimatePresence>
      {presenterOpen && (
        <motion.aside
          key="presenter-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.28, ease: 'easeInOut' }}
          className="fixed right-0 top-0 bottom-0 z-[60] flex w-80 flex-col border-l border-slate-700 bg-slate-950 text-white shadow-widget"
          role="dialog"
          aria-label="Presenter controls"
        >
          {/* Header */}
          <header className="flex items-start justify-between border-b border-slate-800 px-4 py-3.5">
            <div>
              <h2 className="text-base font-bold tracking-tight">Presenter Controls</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">⌘⇧P to toggle</p>
            </div>
            <button
              type="button"
              onClick={togglePresenter}
              aria-label="Close presenter controls"
              className="-mr-1 flex h-8 w-8 items-center justify-center rounded-btn text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          {/* Scrollable body */}
          <div className="thin-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
            <CapabilityBadge />
            <ScenarioSelector />
            <ScriptPreview />

            {/* Controls */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={advance}
                disabled={advanceDisabled}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-btn px-4 py-3 text-sm font-bold transition-colors',
                  advanceDisabled
                    ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                    : 'bg-bc-blue text-white hover:bg-bc-blue-dark',
                )}
              >
                Advance ▸ <span className="text-[11px] font-medium opacity-80">(Space)</span>
              </button>

              {/* Auto-play toggle */}
              <button
                type="button"
                onClick={toggleAutoPlay}
                aria-pressed={autoPlay}
                className="flex items-center justify-between rounded-btn border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-left transition-colors hover:bg-slate-800"
              >
                <span className="text-sm font-medium text-slate-200">Auto-play</span>
                <span
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors',
                    autoPlay ? 'bg-bc-green' : 'bg-slate-600',
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                      autoPlay ? 'translate-x-4' : 'translate-x-0.5',
                    )}
                  />
                </span>
              </button>

              {/* Scripted / Live segmented toggle */}
              <div>
                <div className="flex rounded-btn border border-slate-700 bg-slate-800/50 p-0.5">
                  {(['scripted', 'live'] as DemoMode[]).map((m) => {
                    const active = mode === m;
                    const isLive = m === 'live';
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        aria-pressed={active}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors',
                          active
                            ? 'bg-bc-blue text-white'
                            : 'text-slate-400 hover:text-slate-200',
                        )}
                      >
                        {m}
                        {isLive && (
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              liveAvailable ? 'bg-bc-green' : 'bg-slate-500',
                            )}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {!liveAvailable && (
                  <p className="mt-1 text-[10px] text-slate-500">Live requires backend</p>
                )}
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={resetScenario}
                className="w-full rounded-btn border border-slate-700 px-4 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:border-bc-red hover:bg-bc-red/10 hover:text-bc-red"
              >
                Reset scenario
              </button>
            </div>
          </div>

          {/* Keyboard legend */}
          <footer className="border-t border-slate-800 px-4 py-3">
            <p className="text-[10px] leading-relaxed text-slate-500">
              <span className="text-slate-400">⌘⇧P</span> panel ·{' '}
              <span className="text-slate-400">⌘⇧A</span> autoplay ·{' '}
              <span className="text-slate-400">⌘⇧1/2/3</span> scenarios ·{' '}
              <span className="text-slate-400">⌘⇧0</span> reset ·{' '}
              <span className="text-slate-400">Space</span> advance
            </p>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
