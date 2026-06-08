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
    expect(cardTypes).not.toContain('location_permission');
    expect(cardTypes).toContain('choice_group');
    expect(cardTypes).toContain('cost_summary');
    expect(cardTypes).toContain('payment_panel');
    expect(cardTypes).toContain('confirmation');

    expect(JULY4_SCRIPT[0].text).toContain('departing from');
    expect(JULY4_SCRIPT[0].text).toContain('how many people');
    expect(JULY4_SCRIPT[0].card).toBeUndefined();

    const final = JULY4_SCRIPT.at(-1);
    expect(final?.text).toContain('BK-4JUL-29571');
    expect(final?.text).toContain('✅');
    expect(final?.text).not.toContain('✓ A confirmation');
    expect(final?.siteAction?.type).toBe('navigate');
    expect(final?.siteAction?.to).toBe('confirmation');
    expect(final?.siteAction?.data?.itinerarySections).toEqual([
      {
        title: 'Hotel',
        rows: [
          { label: 'Property', value: 'Summercamp Hotel' },
          { label: 'Stay', value: 'Jul 3 - Jul 6, 2026' },
          { label: 'Guests', value: 'Two guests · 3 nights' },
          { label: 'Hotel total', value: '$735' },
        ],
      },
      {
        title: 'Flights',
        rows: [
          { label: 'Airline', value: 'JetBlue' },
          { label: 'Route', value: 'JFK → MVY · Nonstop' },
          { label: 'Outbound', value: 'Jul 3 · 9:15 AM → 10:05 AM' },
          { label: 'Return', value: 'Jul 6 · 6:30 PM → 7:25 PM' },
          { label: 'Flight total', value: '$636' },
        ],
      },
      {
        title: 'Activity',
        rows: [
          { label: 'Experience', value: 'Sunset Sailing Cruise' },
          { label: 'When', value: 'Jul 4 · 2 hours' },
          { label: 'Where', value: 'Edgartown Harbor' },
          { label: 'Activity total', value: '$190' },
        ],
      },
    ]);
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
      expect(destinationTurn.card.options[0].replyText).toBe("Let's go with the Vineyard!");
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
