// Core domain + demo-engine types shared across the app.

export type Channel = 'none' | 'chat' | 'voice' | 'mobile';
export type ViewName = 'home' | 'search' | 'property' | 'confirmation';
export type ScenarioId = 'rachel' | 'david' | 'melissa' | 'july4';
export type DemoMode = 'scripted' | 'live';
export type MessageRole = 'user' | 'agent' | 'system';

export interface Room {
  id: string;
  name: string;
  sleeps: number;
  price: number;
  features: string[];
}

export interface Property {
  id: string;
  name: string;
  location: string;
  tagline: string;
  description: string[];
  rating: number;
  ratingLabel: string;
  reviews: number;
  pricePerNight: number;
  priceNote?: string;
  originalPrice?: number;
  tags: string[];
  facilities: string[];
  rooms: Room[];
  images: string[];
  gradient: string; // CSS gradient fallback when no photo
  urgencyNote?: string;
  isGeniusDiscounted: boolean;
  starRating: number;
}

// ---- Inline chat cards ----

export interface PropertyCardData {
  type: 'property';
  id: string;
  name: string;
  location: string;
  image?: string;
  rating: number;
  ratingLabel: string;
  reviews?: number;
  price: string;
  priceUnit: string;
  tags: string[];
  cta: string;
}

export interface ConfirmationCardData {
  type: 'confirmation';
  confirmationNumber: string;
  property: string;
  dates: string;
  room: string;
  nights: number;
  total: string;
  status: string;
  itinerarySections?: ItinerarySectionData[];
}

export interface ItineraryRowData {
  label: string;
  value: string;
}

export interface ItinerarySectionData {
  title: string;
  rows: ItineraryRowData[];
}

export interface UpsellCardData {
  type: 'upsell';
  name: string;
  description: string;
  price: string;
  priceContext: string;
  cta: string;
}

export interface ConfirmationUpdateCardData {
  type: 'confirmation_update';
  confirmationNumber: string;
  addOn: string;
  addOnPrice: string;
  updatedTotal: string;
  status: string;
}

export interface LocationPermissionCardData {
  type: 'location_permission';
  title: string;
  body: string;
  cta: string;
  replyText: string;
}

export interface ChoiceOptionData {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  price?: string;
  description?: string;
  image?: string;
  imageLabel?: string;
  imagePosition?: string;
  icon?: string;
  replyText: string;
}

export interface ChoiceGroupCardData {
  type: 'choice_group';
  variant: 'travelers' | 'destination_type' | 'destination' | 'hotel' | 'flight' | 'experience';
  title: string;
  layout: 'chips' | 'cards';
  options: ChoiceOptionData[];
}

export interface CostSummaryRowData {
  label: string;
  value: string;
}

export interface CostSummaryCardData {
  type: 'cost_summary';
  title: string;
  rows: CostSummaryRowData[];
  total: string;
  note?: string;
  cta?: string;
  replyText?: string;
}

export interface PaymentPanelCardData {
  type: 'payment_panel';
  title: string;
  options: ChoiceOptionData[];
}

export type CardData =
  | PropertyCardData
  | ConfirmationCardData
  | UpsellCardData
  | ConfirmationUpdateCardData
  | LocationPermissionCardData
  | ChoiceGroupCardData
  | CostSummaryCardData
  | PaymentPanelCardData;

// ---- Site reactivity ----

export interface SiteAction {
  type: 'navigate' | 'updateConfirmation';
  to?: ViewName;
  highlight?: string; // property id to glow in search results
  selectRoom?: string; // room id to pre-select on property detail
  data?: BookingData; // confirmation payload
  addOn?: string;
  updatedTotal?: string;
}

export interface BookingData {
  confirmationNumber: string;
  property: string;
  dates: string;
  room: string;
  total: string;
  itinerarySections?: ItinerarySectionData[];
  addOn?: string;
  addOnPrice?: string;
}

// ---- Scripted messages ----

export interface ScriptMessage {
  role: MessageRole;
  text: string;
  delay: number;
  capability: string;
  isVoice?: boolean;
  card?: CardData;
  siteAction?: SiteAction;
}

export interface NotificationData {
  appName: string;
  title: string;
  body: string;
  timestamp: string;
}

export interface MelissaScript {
  notification: NotificationData;
  chat: ScriptMessage[];
}

// A message as rendered in the UI (script message + a stable id + timestamp).
export interface RenderedMessage extends ScriptMessage {
  id: string;
  ts: number;
}
