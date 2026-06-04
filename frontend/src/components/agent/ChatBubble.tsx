import type { RenderedMessage, CardData } from '../../lib/types';
import { PropertyCard } from './PropertyCard';
import { ConfirmationCard } from './ConfirmationCard';
import { UpsellCard } from './UpsellCard';

interface ChatBubbleProps {
  message: RenderedMessage;
}

// Renders the inline card that matches a message's CardData variant.
function CardRenderer({ card }: { card: CardData }) {
  switch (card.type) {
    case 'property':
      return <PropertyCard data={card} />;
    case 'confirmation':
      return <ConfirmationCard data={card} />;
    case 'upsell':
      return <UpsellCard data={card} />;
    case 'confirmation_update':
      return <ConfirmationCard update={card} />;
    default:
      return null;
  }
}

// A single chat message: user (right) or agent (left), with an optional
// inline card rendered below the text.
export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex w-full justify-end animate-msg-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-bc-blue px-3.5 py-2 text-sm leading-snug text-white shadow-card">
          {message.text}
        </div>
      </div>
    );
  }

  // Agent message (left-aligned with avatar).
  return (
    <div className="flex w-full items-start gap-2 animate-msg-in">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bc-navy text-sm text-white"
        aria-hidden
      >
        ✦
      </div>
      <div className="max-w-[85%]">
        {message.text && (
          <div className="rounded-2xl rounded-tl-sm border border-bc-gray-200 bg-white px-3.5 py-2 text-sm leading-snug text-bc-gray-900 shadow-card">
            {message.text}
          </div>
        )}
        {message.card && <CardRenderer card={message.card} />}
      </div>
    </div>
  );
}
