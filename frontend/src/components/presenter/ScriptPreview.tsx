import { useDemoStore, SCRIPTS } from '../../store/demoStore';
import { cn } from '../../lib/cn';
import type { MessageRole } from '../../lib/types';

const ROLE_LABEL: Record<MessageRole, string> = {
  user: 'User',
  agent: 'GECX',
  system: 'System',
};

const ROLE_STYLE: Record<MessageRole, string> = {
  user: 'bg-slate-700 text-slate-200',
  agent: 'bg-bc-blue text-white',
  system: 'bg-slate-600 text-slate-100',
};

// Shows conversation progress: the next scripted line to be played (so the
// presenter knows what's coming) and how many lines remain. In live mode there
// is no script to preview.
export function ScriptPreview() {
  const scenario = useDemoStore((s) => s.scenario);
  const messageIndex = useDemoStore((s) => s.messageIndex);
  const mode = useDemoStore((s) => s.mode);

  const script = SCRIPTS[scenario];
  const total = script.length;
  const nextLine = script[messageIndex]; // undefined once the script is finished
  const finished = messageIndex >= total;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Next line
        </span>
        <span className="text-[10px] font-medium tabular-nums text-slate-500">
          {Math.min(messageIndex, total)} of {total} played
        </span>
      </div>

      {mode === 'live' ? (
        <div className="rounded-card border border-slate-700 bg-slate-800/50 px-3 py-3 text-[11px] leading-snug text-slate-400">
          Live mode — responses come from the CXAS backend, not a script.
        </div>
      ) : finished ? (
        <div className="rounded-card border border-bc-green/40 bg-bc-green/10 px-3 py-3 text-sm font-semibold text-bc-green">
          ✓ Scenario complete
        </div>
      ) : (
        <div className="rounded-card border border-slate-700 bg-slate-800/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                ROLE_STYLE[nextLine.role],
              )}
            >
              {ROLE_LABEL[nextLine.role]}
            </span>
            <span className="truncate text-[10px] font-medium text-bc-yellow">
              {nextLine.capability || '—'}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-snug text-slate-200">
            {nextLine.text}
          </p>
        </div>
      )}
    </div>
  );
}
