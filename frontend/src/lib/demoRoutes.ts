import type { DemoMode } from './types';

export type DemoScreen = 'google' | 'booking-demo' | 'legacy-app';

export interface DemoRoute {
  screen: DemoScreen;
  mode: DemoMode;
}

function modeFromSegment(segment: string | undefined): DemoMode {
  return segment === 'live' ? 'live' : 'scripted';
}

export function parseDemoPath(pathname: string): DemoRoute {
  const path = pathname.replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'google') {
    return { screen: 'google', mode: modeFromSegment(parts[1]) };
  }

  if (parts[0] === 'demo') {
    return { screen: 'booking-demo', mode: modeFromSegment(parts[1]) };
  }

  return { screen: 'legacy-app', mode: 'scripted' };
}

export function adHrefForGoogleMode(mode: DemoMode): string {
  return mode === 'live' ? '/demo/live' : '/demo/mock';
}
