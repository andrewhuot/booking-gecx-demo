import { JULY4_SCRIPT } from '../data/july4Script';
import type { ChoiceGroupCardData, ScenarioId, ScriptMessage } from './types';

const travelerCard = findJuly4ChoiceCard('travelers');
const destinationTypeCard = findJuly4ChoiceCard('destination_type');

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

export function withLiveFallbackCard(message: ScriptMessage, scenario: ScenarioId): ScriptMessage {
  if (scenario !== 'july4' || message.role !== 'agent' || message.card) {
    return message;
  }

  if (travelerCard && asksForTravelerCount(message.text)) {
    return { ...message, card: travelerCard };
  }

  if (destinationTypeCard && asksForDestinationType(message.text)) {
    return { ...message, card: destinationTypeCard };
  }

  return message;
}
