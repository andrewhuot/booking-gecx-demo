import { describe, expect, it } from 'vitest';
import { PROPERTIES, PROPERTY_MAP, getProperty } from './properties';
import { RACHEL_SCRIPT } from './rachelScript';
import { DAVID_SCRIPT } from './davidScript';
import { MELISSA_SCRIPT } from './melissaScript';
import { JULY4_SCRIPT } from './july4Script';
import { SCRIPTS, SCENARIO_CHANNEL } from '../store/demoStore';
import type { ScriptMessage } from '../lib/types';

const ALL_ROOM_IDS = new Set(PROPERTIES.flatMap((p) => p.rooms.map((r) => r.id)));
const ALL_PROPERTY_IDS = new Set(PROPERTIES.map((p) => p.id));

// Parse a "$1,492" style money string into a number.
function money(s: string): number {
  return Number(s.replace(/[^0-9.]/g, ''));
}

describe('properties data', () => {
  it('has unique property ids', () => {
    expect(ALL_PROPERTY_IDS.size).toBe(PROPERTIES.length);
  });

  it('PROPERTY_MAP and getProperty resolve every property', () => {
    for (const p of PROPERTIES) {
      expect(PROPERTY_MAP[p.id]).toBe(p);
      expect(getProperty(p.id)).toBe(p);
    }
    expect(getProperty('does-not-exist')).toBeUndefined();
  });

  it('has unique room ids across all properties', () => {
    const flat = PROPERTIES.flatMap((p) => p.rooms.map((r) => r.id));
    expect(new Set(flat).size).toBe(flat.length);
  });

  it('every property has a gradient, at least one room, and a positive price', () => {
    for (const p of PROPERTIES) {
      expect(p.gradient).toMatch(/gradient/);
      expect(p.rooms.length).toBeGreaterThan(0);
      expect(p.pricePerNight).toBeGreaterThan(0);
    }
  });
});

describe('script registry', () => {
  it('SCRIPTS maps each scenario to its script array', () => {
    expect(SCRIPTS.rachel).toBe(RACHEL_SCRIPT);
    expect(SCRIPTS.david).toBe(DAVID_SCRIPT);
    expect(SCRIPTS.melissa).toBe(MELISSA_SCRIPT.chat);
    expect(SCRIPTS.july4).toBe(JULY4_SCRIPT);
  });

  it('maps every scenario to a real channel', () => {
    expect(SCENARIO_CHANNEL).toEqual({
      rachel: 'chat',
      david: 'voice',
      melissa: 'mobile',
      july4: 'chat',
    });
  });
});

const NAMED_SCRIPTS: Record<string, ScriptMessage[]> = {
  rachel: RACHEL_SCRIPT,
  david: DAVID_SCRIPT,
  melissa: MELISSA_SCRIPT.chat,
};

describe.each(Object.entries(NAMED_SCRIPTS))('scenario integrity — %s', (_name, script) => {
  it('every message has a non-empty capability and a non-negative delay', () => {
    for (const m of script) {
      expect(m.capability.length).toBeGreaterThan(0);
      expect(m.delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('every property card references a real property', () => {
    for (const m of script) {
      if (m.card?.type === 'property') {
        expect(ALL_PROPERTY_IDS.has(m.card.id)).toBe(true);
      }
    }
  });

  it('every navigate siteAction with a highlight references a real property', () => {
    for (const m of script) {
      const a = m.siteAction;
      if (a?.type === 'navigate' && a.highlight) {
        expect(ALL_PROPERTY_IDS.has(a.highlight)).toBe(true);
      }
    }
  });

  it('every navigate siteAction with selectRoom references a real room', () => {
    for (const m of script) {
      const a = m.siteAction;
      if (a?.type === 'navigate' && a.selectRoom) {
        expect(ALL_ROOM_IDS.has(a.selectRoom)).toBe(true);
      }
    }
  });

  // Each channel conveys the funnel through its own native mechanism: the desktop
  // (Rachel) and voice (David) scenarios drive the live site via siteActions, while
  // the mobile (Melissa) scenario renders everything as inline cards. So the funnel
  // must reach booking → upsell through *either* a confirmation card *or* a
  // confirmation siteAction — not necessarily both.
  it('reaches a booking and then an upsell (compressed funnel)', () => {
    const actions = script.flatMap((m) => (m.siteAction ? [m.siteAction] : []));
    const cards = script.flatMap((m) => (m.card ? [m.card] : []));

    const confirmed =
      actions.some((a) => a.type === 'navigate' && a.to === 'confirmation') ||
      cards.some((c) => c.type === 'confirmation');
    const upsold =
      actions.some((a) => a.type === 'updateConfirmation') ||
      cards.some((c) => c.type === 'confirmation_update');

    expect(confirmed).toBe(true);
    expect(upsold).toBe(true);
  });
});

// Only the card-driven scenarios carry the explicit confirmation/upsell totals we
// can do arithmetic on. (Voice conveys the same numbers verbally, not as data.)
const CARD_FUNNEL_SCRIPTS: Record<string, ScriptMessage[]> = {
  rachel: RACHEL_SCRIPT,
  melissa: MELISSA_SCRIPT.chat,
};

describe.each(Object.entries(CARD_FUNNEL_SCRIPTS))('upsell math — %s', (_name, script) => {
  it('the updated total equals the confirmation total plus the add-on price', () => {
    const confirmCard = script.find((m) => m.card?.type === 'confirmation')?.card;
    const updateCard = script.find((m) => m.card?.type === 'confirmation_update')?.card;
    expect(confirmCard?.type).toBe('confirmation');
    expect(updateCard?.type).toBe('confirmation_update');
    if (confirmCard?.type === 'confirmation' && updateCard?.type === 'confirmation_update') {
      const base = money(confirmCard.total);
      const addOn = money(updateCard.addOnPrice);
      const updated = money(updateCard.updatedTotal);
      expect(updated).toBeGreaterThan(base);
      expect(updated).toBe(base + addOn);
      // The confirmation number is carried through unchanged.
      expect(updateCard.confirmationNumber).toBe(confirmCard.confirmationNumber);
    }
  });
});

// David is voice-only: assert the funnel shape it actually uses (siteActions, no cards).
describe('David voice funnel', () => {
  it('drives the site to confirmation and applies the upsell via siteActions', () => {
    const actions = DAVID_SCRIPT.flatMap((m) => (m.siteAction ? [m.siteAction] : []));
    expect(actions.some((a) => a.type === 'navigate' && a.to === 'confirmation')).toBe(true);
    expect(actions.some((a) => a.type === 'updateConfirmation')).toBe(true);
  });

  it('the updateConfirmation total exceeds the booking total', () => {
    const bookAction = DAVID_SCRIPT.find(
      (m) => m.siteAction?.type === 'navigate' && m.siteAction.to === 'confirmation',
    )?.siteAction;
    const upsellAction = DAVID_SCRIPT.find(
      (m) => m.siteAction?.type === 'updateConfirmation',
    )?.siteAction;
    const base = money(bookAction?.data?.total ?? '0');
    const updated = money(upsellAction?.updatedTotal ?? '0');
    expect(base).toBeGreaterThan(0);
    expect(updated).toBeGreaterThan(base);
  });
});

describe('Rachel funnel specifics', () => {
  it('the booked room belongs to the recommended property', () => {
    const propCard = RACHEL_SCRIPT.find((m) => m.card?.type === 'property')?.card;
    const roomAction = RACHEL_SCRIPT.find((m) => m.siteAction?.selectRoom)?.siteAction;
    expect(propCard?.type).toBe('property');
    if (propCard?.type === 'property' && roomAction?.selectRoom) {
      const property = getProperty(propCard.id);
      const roomIds = property?.rooms.map((r) => r.id) ?? [];
      expect(roomIds).toContain(roomAction.selectRoom);
    }
  });
});
