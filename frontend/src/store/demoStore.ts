import { create } from 'zustand';
import type {
  Channel,
  ViewName,
  ScenarioId,
  DemoMode,
  ScriptMessage,
  RenderedMessage,
  BookingData,
  SiteAction,
} from '../lib/types';
import { RACHEL_SCRIPT } from '../data/rachelScript';
import { DAVID_SCRIPT } from '../data/davidScript';
import { MELISSA_SCRIPT } from '../data/melissaScript';
import { JULY4_SCRIPT, JULY4_WARM_START } from '../data/july4Script';

export const SCRIPTS: Record<ScenarioId, ScriptMessage[]> = {
  rachel: RACHEL_SCRIPT,
  david: DAVID_SCRIPT,
  melissa: MELISSA_SCRIPT.chat,
  july4: JULY4_SCRIPT,
};

// Which channel each scenario uses.
export const SCENARIO_CHANNEL: Record<ScenarioId, Channel> = {
  rachel: 'chat',
  david: 'voice',
  melissa: 'mobile',
  july4: 'chat',
};

export interface ViewParams {
  propertyId?: string;
  highlightId?: string;
  selectedRoomId?: string;
}

let msgCounter = 0;
const nextId = () => `m${msgCounter++}`;

interface DemoState {
  // ---- mode / scenario ----
  mode: DemoMode;
  scenario: ScenarioId;
  channel: Channel;
  autoPlay: boolean;

  // ---- conversation ----
  messages: RenderedMessage[];
  messageIndex: number; // index into the active script of NEXT message to play
  isTyping: boolean;
  capability: string;

  // ---- site ----
  view: ViewName;
  viewParams: ViewParams;
  booking: BookingData | null;

  // ---- presenter / timing ----
  presenterOpen: boolean;
  timerStart: number | null;

  // ---- mobile sub-state ----
  mobileStage: 'home' | 'notification' | 'splash' | 'chat' | 'confirmation';

  // ---- voice sub-state ----
  voiceActive: boolean;

  // ---- live mode ----
  liveAvailable: boolean;

  // ---- actions ----
  setMode: (mode: DemoMode) => void;
  setScenario: (scenario: ScenarioId, openChannel?: boolean) => void;
  setChannel: (channel: Channel) => void;
  openPresenter: () => void;
  togglePresenter: () => void;
  toggleAutoPlay: () => void;
  setLiveAvailable: (v: boolean) => void;

  advance: () => void; // play next scripted message
  resetScenario: () => void;
  startTimerIfNeeded: () => void;
  startJuly4Demo: (mode: DemoMode) => void;
  submitScriptedTurn: (text: string) => void;

  applySiteAction: (action: SiteAction) => void;
  navigateTo: (view: ViewName, params?: ViewParams) => void;

  // live-mode injection (used by the CXAS hook)
  pushUserMessage: (text: string) => void;
  pushAgentMessage: (msg: ScriptMessage) => void;
  setTyping: (v: boolean) => void;

  // mobile
  setMobileStage: (stage: DemoState['mobileStage']) => void;
  triggerNotification: () => void;
  openMobileChat: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  mode: 'scripted',
  scenario: 'rachel',
  channel: 'none',
  autoPlay: false,

  messages: [],
  messageIndex: 0,
  isTyping: false,
  capability: '',

  view: 'home',
  viewParams: {},
  booking: null,

  presenterOpen: false,
  timerStart: null,

  mobileStage: 'home',
  voiceActive: false,
  liveAvailable: false,

  setMode: (mode) => set({ mode }),

  setScenario: (scenario, openChannel = true) => {
    const channel = SCENARIO_CHANNEL[scenario];
    set({
      scenario,
      channel: openChannel ? channel : get().channel,
      messages: [],
      messageIndex: 0,
      isTyping: false,
      capability: '',
      view: 'home',
      viewParams: {},
      booking: null,
      voiceActive: openChannel && channel === 'voice',
      mobileStage: channel === 'mobile' ? 'home' : 'home',
    });
  },

  setChannel: (channel) => set({ channel }),

  openPresenter: () => set({ presenterOpen: true }),
  togglePresenter: () => set((s) => ({ presenterOpen: !s.presenterOpen })),
  toggleAutoPlay: () => set((s) => ({ autoPlay: !s.autoPlay })),
  setLiveAvailable: (liveAvailable) => set({ liveAvailable }),

  startTimerIfNeeded: () => {
    if (get().timerStart == null) set({ timerStart: Date.now() });
  },

  navigateTo: (view, params = {}) =>
    set((s) => ({ view, viewParams: { ...s.viewParams, ...params } })),

  applySiteAction: (action) => {
    const s = get();
    if (action.type === 'navigate' && action.to) {
      const params: ViewParams = {};
      if (action.highlight) params.highlightId = action.highlight;
      if (action.selectRoom) params.selectedRoomId = action.selectRoom;
      // Derive propertyId for the property view from highlight/selectRoom/data.
      if (action.to === 'property') {
        params.propertyId =
          s.viewParams.highlightId ||
          inferPropertyFromRoom(action.selectRoom) ||
          s.viewParams.propertyId;
      }
      let booking = s.booking;
      if (action.data) booking = { ...action.data };
      set({ view: action.to, viewParams: { ...s.viewParams, ...params }, booking });
    } else if (action.type === 'updateConfirmation') {
      const prev = s.booking;
      if (prev) {
        set({
          booking: {
            ...prev,
            addOn: action.addOn,
            total: action.updatedTotal || prev.total,
          },
          view: 'confirmation',
        });
      }
    }
  },

  advance: () => {
    const s = get();
    if (s.mode === 'live') return; // live mode advances via user input
    const script = SCRIPTS[s.scenario];
    if (s.messageIndex >= script.length) return;
    if (s.isTyping) return;

    s.startTimerIfNeeded();
    const msg = script[s.messageIndex];

    const commit = () => {
      const rendered: RenderedMessage = { ...msg, id: nextId(), ts: Date.now() };
      set((st) => ({
        messages: [...st.messages, rendered],
        messageIndex: st.messageIndex + 1,
        isTyping: false,
        capability: msg.capability || st.capability,
      }));
      if (msg.siteAction) get().applySiteAction(msg.siteAction);
    };

    // Agent (and system) messages with a delay show a typing indicator first.
    if ((msg.role === 'agent' || msg.role === 'system') && msg.delay > 0) {
      set({ isTyping: msg.role === 'agent', capability: msg.capability || s.capability });
      window.setTimeout(commit, msg.delay);
    } else {
      commit();
    }
  },

  resetScenario: () => {
    const s = get();
    set({
      messages: [],
      messageIndex: 0,
      isTyping: false,
      capability: '',
      view: 'home',
      viewParams: {},
      booking: null,
      timerStart: null,
      voiceActive: s.channel === 'voice',
      mobileStage: 'home',
    });
  },

  startJuly4Demo: (mode) => {
    const warmStart: RenderedMessage = {
      ...JULY4_WARM_START,
      id: nextId(),
      ts: Date.now(),
    };
    set({
      mode,
      scenario: 'july4',
      channel: 'chat',
      messages: [warmStart],
      messageIndex: 0,
      isTyping: false,
      capability: warmStart.capability,
      view: 'home',
      viewParams: {},
      booking: null,
      voiceActive: false,
      mobileStage: 'home',
      timerStart: null,
    });
  },

  submitScriptedTurn: (text) => {
    const s = get();
    const trimmed = text.trim();
    if (!trimmed || s.mode === 'live' || s.isTyping) return;

    get().startTimerIfNeeded();
    const userMessage: RenderedMessage = {
      role: 'user',
      text: trimmed,
      delay: 0,
      capability: s.capability,
      id: nextId(),
      ts: Date.now(),
    };
    const script = SCRIPTS[s.scenario];
    const next = script[s.messageIndex];

    set((st) => ({
      messages: [...st.messages, userMessage],
      isTyping: Boolean(next && next.role === 'agent' && next.delay > 0),
    }));

    if (!next) return;

    const commit = () => {
      const rendered: RenderedMessage = { ...next, id: nextId(), ts: Date.now() };
      set((st) => ({
        messages: [...st.messages, rendered],
        messageIndex: st.messageIndex + 1,
        isTyping: false,
        capability: next.capability || st.capability,
      }));
      if (next.siteAction) get().applySiteAction(next.siteAction);
    };

    if (next.role === 'agent' && next.delay > 0) {
      window.setTimeout(commit, next.delay);
    } else {
      commit();
    }
  },

  pushUserMessage: (text) => {
    get().startTimerIfNeeded();
    const rendered: RenderedMessage = {
      role: 'user',
      text,
      delay: 0,
      capability: get().capability,
      id: nextId(),
      ts: Date.now(),
    };
    set((st) => ({ messages: [...st.messages, rendered] }));
  },

  pushAgentMessage: (msg) => {
    const rendered: RenderedMessage = { ...msg, id: nextId(), ts: Date.now() };
    set((st) => ({
      messages: [...st.messages, rendered],
      isTyping: false,
      capability: msg.capability || st.capability,
    }));
    if (msg.siteAction) get().applySiteAction(msg.siteAction);
  },

  setTyping: (isTyping) => set({ isTyping }),

  setMobileStage: (mobileStage) => set({ mobileStage }),

  triggerNotification: () => {
    if (get().channel !== 'mobile') {
      get().setScenario('melissa');
    }
    set({ mobileStage: 'notification' });
  },

  openMobileChat: () => {
    set({ mobileStage: 'splash' });
    window.setTimeout(() => set({ mobileStage: 'chat' }), 700);
  },
}));

// Map a room id back to its property (for site actions that only carry a room).
function inferPropertyFromRoom(roomId?: string): string | undefined {
  if (!roomId) return undefined;
  const map: Record<string, string> = {
    'canyon-view-suite': 'enchantment-resort',
    'casita-king': 'enchantment-resort',
    'junior-suite': 'enchantment-resort',
    'creekside-vista-cottage': 'lauberge-sedona',
    'luxury-cottage': 'lauberge-sedona',
    'vista-king-suite': 'lauberge-sedona',
    'canyon-suite-ai': 'mii-amo',
    'spa-suite-ai': 'mii-amo',
  };
  return map[roomId];
}
