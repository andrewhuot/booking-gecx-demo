import { describe, expect, it } from 'vitest';
import { adHrefForGoogleMode, parseDemoPath } from './demoRoutes';

describe('demo route parsing', () => {
  it('routes /google to the fake search page in scripted mock mode', () => {
    expect(parseDemoPath('/google')).toEqual({
      screen: 'google',
      mode: 'scripted',
    });
  });

  it('routes /google/live to the fake search page with a live-mode ad href', () => {
    expect(parseDemoPath('/google/live')).toEqual({
      screen: 'google',
      mode: 'live',
    });
    expect(adHrefForGoogleMode('live')).toBe('/demo/live');
  });

  it('routes /demo/mock and /demo/live to the booking chat demo', () => {
    expect(parseDemoPath('/demo/mock')).toEqual({
      screen: 'booking-demo',
      mode: 'scripted',
    });
    expect(parseDemoPath('/demo/live')).toEqual({
      screen: 'booking-demo',
      mode: 'live',
    });
  });

  it('leaves all legacy paths on the existing app', () => {
    expect(parseDemoPath('/')).toEqual({
      screen: 'legacy-app',
      mode: 'scripted',
    });
  });
});
