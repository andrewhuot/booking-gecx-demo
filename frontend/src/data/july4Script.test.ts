import { describe, expect, it } from 'vitest';
import { JULY4_SCRIPT, JULY4_WARM_START } from './july4Script';

describe('July 4 demo script', () => {
  it('starts with the supplied warm-start Booking.com message', () => {
    expect(JULY4_WARM_START.role).toBe('agent');
    expect(JULY4_WARM_START.text).toContain("America's 250th");
    expect(JULY4_WARM_START.text).toContain('what kind of budget');
  });

  it('covers ad-click chat through final booking confirmation', () => {
    const cardTypes = JULY4_SCRIPT.map((message) => message.card?.type).filter(Boolean);
    expect(cardTypes).toContain('location_permission');
    expect(cardTypes).toContain('choice_group');
    expect(cardTypes).toContain('cost_summary');
    expect(cardTypes).toContain('payment_panel');
    expect(cardTypes).toContain('confirmation');

    const final = JULY4_SCRIPT.at(-1);
    expect(final?.text).toContain('BK-4JUL-29571');
    expect(final?.siteAction?.type).toBe('navigate');
    expect(final?.siteAction?.to).toBe('confirmation');
  });

  it('offers the scripted Martha’s Vineyard choices and checkout total', () => {
    const destinationTurn = JULY4_SCRIPT.find(
      (message) => message.card?.type === 'choice_group' && message.card.variant === 'destination',
    );
    expect(destinationTurn?.card?.type).toBe('choice_group');
    if (destinationTurn?.card?.type === 'choice_group') {
      expect(destinationTurn.card.options.map((option) => option.title)).toContain(
        "Martha's Vineyard, MA",
      );
    }

    const flightTurn = JULY4_SCRIPT.find(
      (message) => message.card?.type === 'choice_group' && message.card.variant === 'flight',
    );
    expect(flightTurn?.card?.type).toBe('choice_group');
    if (flightTurn?.card?.type === 'choice_group') {
      const capeAir = flightTurn.card.options.find((option) => option.id === 'cape-air');
      expect(capeAir?.subtitle).toBe('JFK → BOS → MVY · 1 stop');
      expect(capeAir?.description).toContain('Boston');
    }

    const experienceTurn = JULY4_SCRIPT.find(
      (message) => message.card?.type === 'choice_group' && message.card.variant === 'experience',
    );
    expect(experienceTurn?.text).toContain('$629 under budget');
    expect(experienceTurn?.text).toContain('**Would you like to add an experience to your trip?**');

    const finalSummary = JULY4_SCRIPT.find(
      (message) => message.card?.type === 'cost_summary' && message.card.total === '$1,561',
    );
    expect(finalSummary?.card?.type).toBe('cost_summary');
    if (finalSummary?.card?.type === 'cost_summary') {
      expect(finalSummary.card.rows).toEqual([
        { label: 'JetBlue JFK↔MVY (2 pax)', value: '$636' },
        { label: 'Summercamp Hotel, 3 nights', value: '$735' },
        { label: 'Sunset Sailing Cruise (2 pax)', value: '$190' },
      ]);
    }
  });
});
