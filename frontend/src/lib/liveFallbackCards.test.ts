import { describe, expect, it } from 'vitest';
import type { ChoiceGroupCardData, ScriptMessage } from './types';
import { getLiveFastPathMessage, withLiveFallbackCard } from './liveFallbackCards';

function liveAgentMessage(text: string): ScriptMessage {
  return {
    role: 'agent',
    text,
    delay: 0,
    capability: 'Live',
  };
}

function asChoiceGroup(message: ScriptMessage): ChoiceGroupCardData {
  expect(message.card?.type).toBe('choice_group');
  return message.card as ChoiceGroupCardData;
}

describe('withLiveFallbackCard', () => {
  it('adds traveler chips when a July 4 live reply asks for party size without cards', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        "Perfect, thank you! To help me narrow down the best beach destinations, could you please tell me where you'll be traveling from and how many people will be in your party?",
      ),
      'july4',
    );

    const card = asChoiceGroup(message);
    expect(card.variant).toBe('travelers');
    expect(card.layout).toBe('chips');
    expect(card.options.map((option) => option.title)).toEqual([
      'Just me',
      '2 people',
      '3-4 people',
      '5+',
    ]);
  });

  it('adds destination-type chips when a July 4 live reply asks for beach mountain or city preference', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        'Great, two travelers. What type of destination sounds right for the holiday weekend: beach, mountains, or city escape?',
      ),
      'july4',
    );

    const card = asChoiceGroup(message);
    expect(card.variant).toBe('destination_type');
    expect(card.layout).toBe('chips');
    expect(card.options.map((option) => option.replyText)).toEqual([
      'Beach & coast',
      'Mountains & nature',
      'City escape',
      'Surprise me',
    ]);
  });

  it('does not replace a card returned by the live backend', () => {
    const existingCard: ChoiceGroupCardData = {
      type: 'choice_group',
      variant: 'destination',
      title: 'Existing backend card',
      layout: 'cards',
      options: [
        {
          id: 'existing',
          title: 'Existing',
          replyText: 'Existing',
        },
      ],
    };

    const message = withLiveFallbackCard(
      {
        ...liveAgentMessage('How many people are traveling?'),
        card: existingCard,
      },
      'july4',
    );

    expect(message.card).toBe(existingCard);
  });

  it('does not add July 4 chips to other scenarios', () => {
    const message = withLiveFallbackCard(liveAgentMessage('How many people are traveling?'), 'rachel');

    expect(message.card).toBeUndefined();
  });
});

describe('getLiveFastPathMessage', () => {
  it('returns the destination-type chip prompt for the slow July 4 origin and party-size turn', () => {
    const message = getLiveFastPathMessage(
      "We're leaving from New York City, 2 people.",
      'july4',
    );

    expect(message?.text).toContain('What type of destination');
    const card = asChoiceGroup(message as ScriptMessage);
    expect(card.variant).toBe('destination_type');
    expect(card.options.map((option) => option.title)).toEqual([
      '🏖️ Beach & coast',
      '🏔️ Mountains & nature',
      '🏙️ City escape',
      '🤷 Surprise me',
    ]);
  });

  it('does not fast-path non-July 4 scenarios or unrelated text', () => {
    expect(getLiveFastPathMessage("We're leaving from New York City, 2 people.", 'rachel')).toBeNull();
    expect(getLiveFastPathMessage('Beach & coast', 'july4')).toBeNull();
  });
});
