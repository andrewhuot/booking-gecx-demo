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

  return message;
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
  const polishedMessage = polishLiveMessageText(message, scenario);

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
