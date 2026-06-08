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
  it('formats the live July 4 destination recommendation as bold bullet points', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        "Wonderful! I've found a few fantastic beach destinations for two people traveling from New York City for the July 4th weekend, all within your budget.\n\n" +
          "Here are some options I think you'll love:\n\n" +
          "Martha's Vineyard, MA: A classic New England getaway with charming villages and beautiful beaches. It's an easy trip from NYC, perfect for a relaxed long weekend.\n\n" +
          "Outer Banks, NC: If you're looking for unspoiled beaches, wild horses, and a laid-back vibe, the Outer Banks offers great value and quiet beaches.\n\n" +
          "Kennebunkport, ME: This destination combines rugged coastline with a charming seaside village, known for its lobster rolls and cooler temperatures.\n\n" +
          'Which of these sounds most appealing to you?',
      ),
      'july4',
    );

    expect(message.text).toContain("- **Martha's Vineyard, MA:**");
    expect(message.text).toContain('- **Outer Banks, NC:**');
    expect(message.text).toContain('- **Kennebunkport, ME:**');
    expect(message.text).not.toContain('Here are some options I think');
  });

  it('formats the live Martha’s Vineyard hotel intro as short readable paragraphs', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        "Excellent choice! Martha's Vineyard is beautiful. I've found a few hotels for you there, keeping your budget in mind for a July 3rd to July 6th stay.",
      ),
      'july4',
    );

    expect(message.text).toContain("**Martha's Vineyard**");
    expect(message.text).toContain('**July 3-6**');
    expect(message.text).not.toContain("I've found a few hotels for you there");
  });

  it('formats the live flight options as bold logical bullets', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        "Excellent choice! The Summercamp Hotel is a fantastic option for a fun and stylish stay.\n\n" +
          "Now, let's look at flights from New York City to Martha's Vineyard for those dates. I've found two options for you:\n\n" +
          "There's a nonstop JetBlue flight from JFK that's under an hour each way, costing $636 for two people. Alternatively, Cape Air is a bit less expensive at $496 for two, but it requires a connection through Boston.\n\n" +
          'Which flight option works best for you?',
      ),
      'july4',
    );

    expect(message.text).toContain('- **JetBlue nonstop:** JFK → MVY');
    expect(message.text).toContain('- **Cape Air via Boston:** JFK → BOS → MVY');
    expect(message.text).toContain('**$636 total for 2**');
    expect(message.text).toContain('**$496 total for 2**');
    expect(message.text).not.toContain("There's a nonstop JetBlue flight");
  });

  it('formats the live experience upsell around the remaining budget value proposition', () => {
    const message = withLiveFallbackCard(
      liveAgentMessage(
        "Great! JetBlue it is. With the Summercamp Hotel and JetBlue flights, you've spent $735 for the hotel and $636 for flights, leaving you with a remaining budget of $629 for experiences.\n\n" +
          'How about adding a special experience to your trip? I have two options that would be perfect for a holiday weekend:\n\n' +
          "You could take a Sunset Sailing Cruise on July 4th to watch the fireworks from the water. It's $190 for two people. Or, there's an Island Bike & Wine Tour on July 5th for $150 for two, which includes a guided ride and vineyard tastings.\n\n" +
          "Which of these sounds more appealing to celebrate America's 250th birthday?",
      ),
      'july4',
    );

    expect(message.text).toContain("**You're currently $629 under budget!**");
    expect(message.text).toContain('**Would you like to add an experience to your trip?**');
    expect(message.text).toContain('- **Sunset Sailing Cruise:**');
    expect(message.text).toContain('- **Island Bike & Wine Tour:**');
    expect(message.text).not.toContain('remaining budget of $629 for experiences');
  });

  it('formats the current live experience upsell even when activity details are only in cards', () => {
    const experienceCard: ChoiceGroupCardData = {
      type: 'choice_group',
      variant: 'experience',
      title: 'Holiday weekend experiences',
      layout: 'cards',
      options: [
        {
          id: 'sunset-sailing',
          title: 'Sunset Sailing Cruise',
          replyText: 'The sunset cruise on July 4th sounds amazing, let’s do it',
        },
      ],
    };

    const message = withLiveFallbackCard(
      {
        ...liveAgentMessage(
          "Great! JetBlue will get you there comfortably.\n\n" +
            "With the Summercamp Hotel and JetBlue flights, you've spent $735 for the hotel and $636 for flights, leaving you with about $629 from your $2,000 budget.\n\n" +
            'Would you like to add an experience to your trip? Here are a couple of options for the holiday weekend:',
        ),
        card: experienceCard,
      },
      'july4',
    );

    expect(message.text).toContain("**You're currently $629 under budget!**");
    expect(message.text).toContain('**Would you like to add an experience to your trip?**');
    expect(message.text).toContain('- **Sunset Sailing Cruise:**');
    expect(message.text).not.toContain('about $629 from your $2,000 budget');
    expect(message.card).toBe(experienceCard);
  });

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

  it('normalizes the Cape Air live flight card to show the Boston connection from JFK', () => {
    const card: ChoiceGroupCardData = {
      type: 'choice_group',
      variant: 'flight',
      title: "NYC to Martha's Vineyard flights",
      layout: 'cards',
      options: [
        {
          id: 'cape-air',
          title: 'Cape Air',
          subtitle: 'BOS → MVY · Nonstop',
          meta: 'Depart 11:00 AM → Arrive 11:35 AM · Return 4:45 PM → 5:20 PM',
          price: '$248/person · $496 total for 2',
          description: "A bit less, but you'd need to connect through Boston first.",
          replyText: 'Cape Air is fine',
        },
      ],
    };

    const message = withLiveFallbackCard(
      {
        ...liveAgentMessage('Which flight option works best?'),
        card,
      },
      'july4',
    );

    const normalizedCard = asChoiceGroup(message);
    expect(normalizedCard.options[0].subtitle).toBe('JFK → BOS → MVY · 1 stop');
    expect(normalizedCard.options[0].description).toContain('Boston');
    expect(normalizedCard.options[0].description).toContain('Cape Air hop');
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
