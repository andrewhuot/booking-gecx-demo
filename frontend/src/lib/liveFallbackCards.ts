import { JULY4_SCRIPT } from '../data/july4Script';
import type { ChoiceGroupCardData, ScenarioId, ScriptMessage } from './types';

const travelerCard = findJuly4ChoiceCard('travelers');
const destinationTypeCard = findJuly4ChoiceCard('destination_type');
const destinationTypeMessage = JULY4_SCRIPT.find(
  (message) => message.card?.type === 'choice_group' && message.card.variant === 'destination_type',
);

function findJuly4ChoiceCard(variant: ChoiceGroupCardData['variant']): ChoiceGroupCardData | undefined {
  const card = JULY4_SCRIPT.find(
    (message) => message.card?.type === 'choice_group' && message.card.variant === variant,
  )?.card;
  return card?.type === 'choice_group' ? card : undefined;
}

function asksForTravelerCount(text: string): boolean {
  return (
    /\bhow many\b.*\b(people|travelers|travellers|guests)\b/i.test(text) ||
    /\b(people|travelers|travellers|guests)\b.*\bwill be in your party\b/i.test(text) ||
    /\bparty size\b/i.test(text) ||
    /\bnumber of (people|travelers|travellers|guests)\b/i.test(text)
  );
}

function asksForDestinationType(text: string): boolean {
  return (
    /\bwhat type of destination\b/i.test(text) ||
    /\bwhat kind of destination\b/i.test(text) ||
    /\bdestination sounds right\b/i.test(text) ||
    (/\bbeach/i.test(text) && /\bmountain/i.test(text) && /\bcity/i.test(text))
  );
}

function hasDepartureAndTravelerCount(text: string): boolean {
  return (
    /\b(leaving|departing|flying|traveling|travelling)\s+from\b/i.test(text) &&
    /\b(new york city|nyc|new york)\b/i.test(text) &&
    /\b(2|two)\s+(people|travelers|travellers|guests|adults)\b/i.test(text)
  );
}

function isDestinationRecommendationText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('fantastic beach destinations') &&
    normalized.includes("martha's vineyard") &&
    normalized.includes('outer banks') &&
    normalized.includes('kennebunkport')
  );
}

function isMarthasVineyardHotelIntro(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("martha's vineyard") &&
    normalized.includes('hotel') &&
    (normalized.includes('july 3rd to july 6th') || normalized.includes('july 3') || normalized.includes('july 6'))
  );
}

function isFlightOptionsText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('summercamp hotel') &&
    normalized.includes('jetblue') &&
    normalized.includes('cape air') &&
    normalized.includes('connection through boston')
  );
}

function isExperienceUpsellText(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('jetblue') &&
    normalized.includes('summercamp hotel') &&
    normalized.includes('remaining budget') &&
    normalized.includes('sunset sailing') &&
    normalized.includes('bike') &&
    normalized.includes('wine')
  );
}

function polishLiveMessageText(message: ScriptMessage, scenario: ScenarioId): ScriptMessage {
  if (scenario !== 'july4' || message.role !== 'agent' || !message.text) {
    return message;
  }

  if (isDestinationRecommendationText(message.text)) {
    return {
      ...message,
      text:
        'Wonderful — I found three beach destinations for two from New York City that fit your July 4th budget.\n\n' +
        "- **Martha's Vineyard, MA:** Classic New England coastline, charming villages, seafood shacks, and calm beaches. Easy from NYC and ideal for a relaxed long weekend.\n" +
        '- **Outer Banks, NC:** Unspoiled beaches, wild horses, and a laid-back coastal vibe with strong value and quieter beaches.\n' +
        '- **Kennebunkport, ME:** Rugged Maine coastline, lobster rolls, tidal pools, and cooler summer temperatures.\n\n' +
        'Which one sounds most appealing?',
    };
  }

  if (isMarthasVineyardHotelIntro(message.text)) {
    return {
      ...message,
      text:
        "Excellent choice — **Martha's Vineyard** is beautiful for the holiday weekend.\n\n" +
        'Here are a few hotel options for **July 3-6** that keep the overall budget in mind.',
    };
  }

  if (isFlightOptionsText(message.text)) {
    return {
      ...message,
      text:
        '**Summercamp Hotel** is a great fit for a fun, stylish stay.\n\n' +
        "For flights from New York City to Martha's Vineyard, I found two good options:\n\n" +
        '- **JetBlue nonstop:** JFK → MVY, under an hour each way, **$636 total for 2**.\n' +
        '- **Cape Air via Boston:** JFK → BOS → MVY, **$496 total for 2**. It is a bit cheaper, but adds the Boston connection.\n\n' +
        'Which flight option works best?',
    };
  }

  if (isExperienceUpsellText(message.text)) {
    return {
      ...message,
      text:
        "**You're currently $629 under budget!** Would you like to add one memorable holiday experience and still stay comfortably within your $2,000 plan?\n\n" +
        '- **Sunset Sailing Cruise:** Watch the July 4 fireworks from Edgartown Harbor, **$190 total for 2**.\n' +
        '- **Island Bike & Wine Tour:** A relaxed July 5 vineyard ride with tastings, **$150 total for 2**.\n\n' +
        'Which add-on would make the trip feel complete?',
    };
  }

  return message;
}

function normalizeLiveCard(message: ScriptMessage, scenario: ScenarioId): ScriptMessage {
  if (
    scenario !== 'july4' ||
    message.card?.type !== 'choice_group' ||
    message.card.variant !== 'flight'
  ) {
    return message;
  }

  let changed = false;
  const options = message.card.options.map((option) => {
    if (option.id !== 'cape-air' && option.title !== 'Cape Air') {
      return option;
    }

    changed = true;
    return {
      ...option,
      subtitle: 'JFK → BOS → MVY · 1 stop',
      meta: 'Depart 9:30 AM → Arrive 11:35 AM · Return 4:45 PM → 7:20 PM',
      description: 'A bit less, but you connect through Boston before the short Cape Air hop to MVY.',
    };
  });

  if (!changed) {
    return message;
  }

  return {
    ...message,
    card: {
      ...message.card,
      options,
    },
  };
}

export function getLiveFastPathMessage(
  userText: string,
  scenario: ScenarioId,
): ScriptMessage | null {
  if (scenario !== 'july4' || !destinationTypeMessage || !hasDepartureAndTravelerCount(userText)) {
    return null;
  }

  return {
    ...destinationTypeMessage,
    delay: 0,
  };
}

export function withLiveFallbackCard(message: ScriptMessage, scenario: ScenarioId): ScriptMessage {
  const polishedMessage = normalizeLiveCard(polishLiveMessageText(message, scenario), scenario);

  if (scenario !== 'july4' || polishedMessage.role !== 'agent' || polishedMessage.card) {
    return polishedMessage;
  }

  if (travelerCard && asksForTravelerCount(polishedMessage.text)) {
    return { ...polishedMessage, card: travelerCard };
  }

  if (destinationTypeCard && asksForDestinationType(polishedMessage.text)) {
    return { ...polishedMessage, card: destinationTypeCard };
  }

  return polishedMessage;
}
