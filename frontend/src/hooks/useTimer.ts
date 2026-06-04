import { useEffect, useState } from 'react';
import { useDemoStore } from '../store/demoStore';

// Returns elapsed mm:ss since the first interaction (timerStart). 00:00 until then.
export function useTimer(): string {
  const timerStart = useDemoStore((s) => s.timerStart);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (timerStart == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timerStart]);

  if (timerStart == null) return '00:00';
  const elapsed = Math.max(0, Math.floor((now - timerStart) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
