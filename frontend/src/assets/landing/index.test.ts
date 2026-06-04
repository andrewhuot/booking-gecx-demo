import { describe, expect, it } from 'vitest';
import { landingImages } from './index';

// Vite resolves image imports to fingerprinted URL strings at build time; in the
// test (Vite) environment they resolve to module paths. Either way every key must
// be a non-empty string so the Homepage never renders a broken <img src="">.
describe('landingImages', () => {
  const keys = Object.keys(landingImages) as Array<keyof typeof landingImages>;

  it('exposes every landing image used by the Homepage', () => {
    // Hero + 5 destinations + 5 property types + 3 inspiration cards.
    expect(keys).toHaveLength(14);
  });

  it.each(keys)('resolves "%s" to a non-empty URL', (key) => {
    const url = landingImages[key];
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
