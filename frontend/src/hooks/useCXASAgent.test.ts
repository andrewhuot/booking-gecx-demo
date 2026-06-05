import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './useCXASAgent';

describe('resolveApiUrl', () => {
  it('uses the current browser hostname when no Vite API URL is configured', () => {
    const apiUrl = resolveApiUrl('', {
      protocol: 'http:',
      hostname: '127.0.0.1',
    });

    expect(apiUrl).toBe('http://127.0.0.1:8000');
  });

  it('keeps an explicit Vite API URL unchanged', () => {
    expect(resolveApiUrl('https://api.example.test', window.location)).toBe(
      'https://api.example.test',
    );
  });
});
