import { useDemoStore } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { ScenarioId } from '../../lib/types';

interface ScenarioMeta {
  id: ScenarioId;
  name: string;
  channelLabel: string;
  description: string;
}

// Friendly channel labels + one-line pitches, transcribed from the brief.
const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'rachel',
    name: 'Rachel',
    channelLabel: 'Desktop Chat',
    description:
      'Planning a milestone family trip — discovery to booking to upsell via the chat widget.',
  },
  {
    id: 'david',
    name: 'David',
    channelLabel: 'Voice Call',
    description:
      'Anniversary getaway booked hands-free over a voice call, with a contextual spa upsell.',
  },
  {
    id: 'melissa',
    name: 'Melissa',
    channelLabel: 'Mobile Push',
    description:
      'Proactive re-engagement: a push notification re-opens a lapsed user and books a solo wellness reset.',
  },
];

// Three selectable scenario cards. Picking one resets the conversation and
// opens that scenario's channel (handled by the store's setScenario).
export function ScenarioSelector() {
  const activeScenario = useDemoStore((s) => s.scenario);
  const setScenario = useDemoStore((s) => s.setScenario);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Scenario
      </span>
      <div className="flex flex-col gap-2">
        {SCENARIOS.map((scenario) => {
          const active = scenario.id === activeScenario;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setScenario(scenario.id)}
              aria-pressed={active}
              className={cn(
                'rounded-card border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-bc-blue bg-bc-blue/15 ring-1 ring-bc-blue'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-sm font-bold',
                    active ? 'text-white' : 'text-slate-200',
                  )}
                >
                  {scenario.name}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    active
                      ? 'bg-bc-blue text-white'
                      : 'bg-slate-700 text-slate-300',
                  )}
                >
                  {scenario.channelLabel}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-slate-400">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
