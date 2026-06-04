import type { ScriptMessage } from '../lib/types';

// Scenario 2 — David (Voice Call). We hear only the agent side; David's lines
// appear as transcript text. Agent lines are spoken via Web Speech API.
export const DAVID_SCRIPT: ScriptMessage[] = [
  {
    role: 'agent',
    text: 'Hi David, welcome back to Booking.com. How can I help you today?',
    delay: 400,
    isVoice: true,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'user',
    text: 'Hey, my anniversary is coming up and I want to plan something special. We usually just do dinner in town, but this year I want to actually go somewhere. Nothing too far.',
    delay: 0,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'agent',
    text: 'Congrats. So something within easy travel from Austin — more of an active trip with wineries and exploring, or more of a slow-down-and-be-pampered weekend?',
    delay: 1500,
    isVoice: true,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'user',
    text: "Pampered. My wife's been saying she wants a real spa trip.",
    delay: 0,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'agent',
    text: 'Budget-wise, any guardrails?',
    delay: 1000,
    isVoice: true,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'user',
    text: 'Under five hundred a night.',
    delay: 0,
    capability: 'Voice Intent Grounding',
  },
  {
    role: 'agent',
    text: "I'd suggest L'Auberge de Sedona. Luxury resort on Oak Creek — creekside cottages, on-site spa, designed for couples. Austin to Phoenix is two and a half hours, then a scenic drive up. Creekside Cottage runs about $465 a night, just under your range. Sound right?",
    delay: 2000,
    isVoice: true,
    capability: 'Personalized Matching',
    siteAction: {
      type: 'navigate',
      to: 'search',
      highlight: 'lauberge-sedona',
    },
  },
  {
    role: 'user',
    text: 'That sounds incredible. Our anniversary is November 8th. Can we do Friday through Sunday?',
    delay: 0,
    capability: 'Voice Checkout',
  },
  {
    role: 'agent',
    text: 'Creekside Vista Cottage, November 7 through 9, two nights, $465 per night — $930 before taxes. Book it to your Genius account with the Visa ending in 4782?',
    delay: 1800,
    isVoice: true,
    capability: 'Voice Checkout',
    siteAction: {
      type: 'navigate',
      to: 'property',
      selectRoom: 'creekside-vista-cottage',
    },
  },
  {
    role: 'user',
    text: 'Do it.',
    delay: 0,
    capability: 'Voice Checkout',
  },
  {
    role: 'agent',
    text: "Done. Confirmation Bravo-Kilo-9-3-0-1-2-7-7. I'll send details to your email.",
    delay: 1400,
    isVoice: true,
    capability: 'Voice Checkout',
    siteAction: {
      type: 'navigate',
      to: 'confirmation',
      data: {
        confirmationNumber: 'BK-9301277',
        property: "L'Auberge de Sedona",
        dates: 'Nov 7 – Nov 9, 2025',
        room: 'Creekside Vista Cottage',
        total: '$930',
      },
    },
  },
  {
    role: 'system',
    text: 'PRIMARY BOOKING COMPLETE — UPSELL PHASE',
    delay: 2000,
    capability: 'Contextual Upsell',
  },
  {
    role: 'agent',
    text: "One thought — since it's your anniversary, L'Auberge has a couples' package: 90-minute side-by-side spa treatment, private creekside dinner, champagne on arrival. $380 total. Want me to add it?",
    delay: 1500,
    isVoice: true,
    capability: 'Contextual Upsell',
  },
  {
    role: 'user',
    text: 'No-brainer. Add it.',
    delay: 0,
    capability: 'Contextual Upsell',
  },
  {
    role: 'agent',
    text: 'Added. Updated total: $1,310. Happy anniversary, David.',
    delay: 1200,
    isVoice: true,
    capability: 'Contextual Upsell',
    siteAction: {
      type: 'updateConfirmation',
      addOn: "Couples' Anniversary Package",
      updatedTotal: '$1,310',
    },
  },
];
