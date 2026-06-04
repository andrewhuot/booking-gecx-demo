// Core domain + demo-engine types shared across the app.

export type Channel = 'none' | 'chat' | 'voice' | 'mobile';
export type ViewName = 'home' | 'search' | 'property' | 'confirmation';
export type ScenarioId = 'rachel' | 'david' | 'melissa';
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

export type CardData =
  | PropertyCardData
  | ConfirmationCardData
  | UpsellCardData
  | ConfirmationUpdateCardData;

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
