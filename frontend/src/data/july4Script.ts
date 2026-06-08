import type { ItinerarySectionData, ScriptMessage } from '../lib/types';

export const JULY4_WARM_START: ScriptMessage = {
  role: 'agent',
  text:
    "Welcome! This July 4th is a big one — America's 250th. 🎆 I can help you plan the whole weekend right here: flights, hotel, and things to do.\n\nTo get started, what kind of budget are you working with for the trip? A rough range is perfect.",
  delay: 0,
  capability: 'Warm Start',
};

const JULY4_CONFIRMED_ITINERARY: ItinerarySectionData[] = [
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
];

export const JULY4_SCRIPT: ScriptMessage[] = [
  {
    role: 'agent',
    text:
      "$2,000 all-in — there's a lot we can do with that. Where are you departing from, and how many people are traveling?",
    delay: 900,
    capability: 'Origin and Party Capture',
  },
  {
    role: 'agent',
    text: 'Perfect — New York City for two travelers. What type of destination sounds right for the holiday weekend?',
    delay: 750,
    capability: 'Adaptive Input',
    card: {
      type: 'choice_group',
      variant: 'destination_type',
      title: 'What type of destination?',
      layout: 'chips',
      options: [
        { id: 'beach', title: '🏖️ Beach & coast', replyText: 'Beach & coast' },
        { id: 'mountains', title: '🏔️ Mountains & nature', replyText: 'Mountains & nature' },
        { id: 'city', title: '🏙️ City escape', replyText: 'City escape' },
        { id: 'surprise', title: '🤷 Surprise me', replyText: 'Surprise me' },
      ],
    },
  },
  {
    role: 'agent',
    text: 'A beach weekend for two, July 3-6, under $2,000 from NYC. Here are three destinations that fit well:',
    delay: 1200,
    capability: 'Curated Recommendations',
    card: {
      type: 'choice_group',
      variant: 'destination',
      title: 'July 4th beach destinations',
      layout: 'cards',
      options: [
        {
          id: 'marthas-vineyard',
          title: "Martha's Vineyard, MA",
          imageLabel: 'Menemsha harbor at golden hour',
          meta: '30-min flight from NYC or ~5hr drive',
          price: '~$1,600',
          description:
            'Classic New England coastline, charming villages, seafood shacks, and calm beaches. Easy to reach and perfect for a relaxed long weekend without the flight hassle.',
          replyText: "Let's go with the Vineyard!",
        },
        {
          id: 'outer-banks',
          title: 'Outer Banks, NC',
          imageLabel: 'Wild horses on a wide, empty beach',
          meta: '~1.5hr flight to Norfolk + 1hr drive',
          price: '~$1,400',
          description:
            'Miles of unspoiled barrier island beaches, wild horses, and laid-back Southern coastal charm. July 4th bonfires on the beach are a local tradition.',
          replyText: 'Show me the Outer Banks',
        },
        {
          id: 'kennebunkport',
          title: 'Kennebunkport, ME',
          imageLabel: 'Rocky coast, lighthouse, crashing waves',
          meta: '~1.5hr flight to Portland + 30min drive',
          price: '~$1,750',
          description:
            'Rugged New England coastline meets charming seaside village. Lobster rolls, tidal pools, and cooler temps if you want to escape the summer heat.',
          replyText: 'Show me Kennebunkport',
        },
      ],
    },
  },
  {
    role: 'agent',
    text:
      "Great choice — Martha's Vineyard is a wonderful spot for the holiday weekend. Here are three highly rated hotel options available for 2 guests, July 3-6:",
    delay: 1500,
    capability: 'Hotel Selection',
    card: {
      type: 'choice_group',
      variant: 'hotel',
      title: "Martha's Vineyard hotels",
      layout: 'cards',
      options: [
        {
          id: 'harbor-view',
          title: 'Harbor View Hotel',
          subtitle: '⭐ 4.6 · Edgartown · Waterfront',
          price: '$289/night · $867 total',
          description:
            'Steps from Edgartown Harbor. Classic Vineyard charm, rooftop deck, complimentary bikes. Great if you want to be in the heart of town.',
          replyText: 'Harbor View looks good',
        },
        {
          id: 'summercamp',
          title: 'Summercamp Hotel',
          subtitle: '⭐ 4.4 · Oak Bluffs · Near beach',
          price: '$245/night · $735 total',
          description:
            'Renovated with a playful, retro vibe. Pool, fire pits, and live music on weekends. Walking distance to the ferry and gingerbread cottages.',
          replyText: 'This one — looks fun and the price is right',
        },
        {
          id: 'christopher',
          title: 'The Christopher',
          subtitle: '⭐ 4.7 · Edgartown · Boutique',
          price: '$310/night · $930 total',
          description:
            'Intimate boutique hotel with a celebrated on-site restaurant. Quiet luxury. Ideal for a more upscale, relaxed escape.',
          replyText: 'The Christopher sounds nice',
        },
      ],
    },
  },
  {
    role: 'agent',
    text: "Summercamp Hotel — great pick. 3 nights for 2 guests, July 3-6, $735 total. Now let's find your flights.",
    delay: 1200,
    capability: 'Flight Selection',
    card: {
      type: 'choice_group',
      variant: 'flight',
      title: 'NYC to Martha’s Vineyard flights',
      layout: 'cards',
      options: [
        {
          id: 'jetblue',
          title: 'JetBlue',
          subtitle: 'JFK → MVY · Nonstop',
          meta: 'Depart 9:15 AM → Arrive 10:05 AM · Return 6:30 PM → 7:25 PM',
          price: '$318/person · $636 total for 2',
          description: 'Nonstop from JFK — under an hour each way.',
          replyText: 'JetBlue for sure',
        },
        {
          id: 'cape-air',
          title: 'Cape Air',
          subtitle: 'JFK → BOS → MVY · 1 stop',
          meta: 'Depart 9:30 AM → Arrive 11:35 AM · Return 4:45 PM → 7:20 PM',
          price: '$248/person · $496 total for 2',
          description: 'A bit less, but you connect through Boston before the short Cape Air hop to MVY.',
          replyText: 'Cape Air is fine',
        },
      ],
    },
  },
  {
    role: 'agent',
    text:
      "**You're currently $629 under budget!** **Would you like to add an experience to your trip?** You can add one memorable holiday experience and still stay comfortably within your $2,000 plan.\n\n" +
      '- **Sunset Sailing Cruise:** Watch the July 4 fireworks from Edgartown Harbor, **$190 total for 2**.\n' +
      '- **Island Bike & Wine Tour:** A relaxed July 5 vineyard ride with tastings, **$150 total for 2**.\n\n' +
      'Which add-on would make the trip feel complete?',
    delay: 1200,
    capability: 'Budget-Aware Upsell',
    card: {
      type: 'choice_group',
      variant: 'experience',
      title: 'Holiday weekend experiences',
      layout: 'cards',
      options: [
        {
          id: 'sunset-sailing',
          title: 'Sunset Sailing Cruise',
          subtitle: 'Edgartown Harbor · 2 hours',
          meta: 'July 4 · Departs 6:30 PM',
          price: '$95/person · $190 for 2',
          description:
            'Watch the 250th anniversary fireworks from the water. BYOB, small group, with golden hour views of the harbor and coastline.',
          replyText: 'The sunset cruise on July 4th sounds amazing, let’s do it',
        },
        {
          id: 'bike-wine',
          title: 'Island Bike & Wine Tour',
          subtitle: 'Vineyard Haven → Aquinnah · 4 hours',
          meta: 'July 5 · Departs 10:00 AM',
          price: '$75/person · $150 for 2',
          description:
            'A guided ride through rolling farmland with stops at two vineyards for tastings. A relaxing way to spend the morning after the 4th.',
          replyText: 'The bike and wine tour sounds fun',
        },
      ],
    },
  },
  {
    role: 'agent',
    text:
      'Great choice — fireworks from the harbor is a memorable way to spend the 250th. Here’s your complete trip:',
    delay: 1200,
    capability: 'Funnel Compression',
    card: {
      type: 'cost_summary',
      title: "July 4th Weekend — Martha's Vineyard",
      rows: [
        { label: 'JetBlue JFK↔MVY (2 pax)', value: '$636' },
        { label: 'Summercamp Hotel, 3 nights', value: '$735' },
        { label: 'Sunset Sailing Cruise (2 pax)', value: '$190' },
      ],
      total: '$1,561',
      note: "That's $439 under your budget.",
      cta: 'Book This Trip',
      replyText: 'Book This Trip',
    },
  },
  {
    role: 'agent',
    text: 'Absolutely. Choose how you’d like to confirm the booking.',
    delay: 800,
    capability: 'Checkout',
    card: {
      type: 'payment_panel',
      title: 'Complete booking',
      options: [
        {
          id: 'visa',
          title: 'Visa ending in 4242',
          subtitle: 'Saved card',
          icon: '💳',
          replyText: 'Use my saved Visa and confirm',
        },
        {
          id: 'google-pay',
          title: 'Google Pay',
          subtitle: 'Fast checkout',
          icon: 'G',
          replyText: 'Use Google Pay',
        },
        {
          id: 'new-card',
          title: 'Enter new card',
          subtitle: 'Secure payment',
          icon: '+',
          replyText: 'Enter a new card',
        },
      ],
    },
  },
  {
    role: 'agent',
    text:
      "You're all set — everything is booked. ✅ A confirmation has been sent to your email with booking reference BK-4JUL-29571.\n\nI'll follow up a few days before your trip with check-in details, a weather update, and a packing suggestion. If anything changes, you can message me here or call our support line anytime. Have a wonderful 250th. 🇺🇸",
    delay: 1100,
    capability: 'Confirmed Booking',
    card: {
      type: 'confirmation',
      confirmationNumber: 'BK-4JUL-29571',
      property: 'Summercamp Hotel',
      dates: 'Jul 3 - Jul 6, 2026',
      room: 'Two guests · 3 nights',
      nights: 3,
      total: '$1,561',
      status: 'Confirmed',
      itinerarySections: JULY4_CONFIRMED_ITINERARY,
    },
    siteAction: {
      type: 'navigate',
      to: 'confirmation',
      data: {
        confirmationNumber: 'BK-4JUL-29571',
        property: 'Summercamp Hotel',
        dates: 'Jul 3 - Jul 6, 2026',
        room: 'Two guests · 3 nights',
        total: '$1,561',
        itinerarySections: JULY4_CONFIRMED_ITINERARY,
      },
    },
  },
];
