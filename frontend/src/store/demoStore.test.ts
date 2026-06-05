import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoStore, SCRIPTS, SCENARIO_CHANNEL } from './demoStore';
import type { SiteAction } from '../lib/types';

// The store is a module singleton. Capture its pristine state once so every test
// starts from a known baseline regardless of execution order.
const INITIAL = useDemoStore.getState();

function reset() {
  useDemoStore.setState(INITIAL, true);
}

describe('demoStore — scenario selection', () => {
  beforeEach(reset);

  it('selecting a scenario opens its channel and clears the conversation', () => {
    useDemoStore.getState().setScenario('david');
    const s = useDemoStore.getState();
    expect(s.scenario).toBe('david');
    expect(s.channel).toBe(SCENARIO_CHANNEL.david); // 'voice'
    expect(s.messages).toEqual([]);
    expect(s.messageIndex).toBe(0);
    expect(s.view).toBe('home');
    expect(s.booking).toBeNull();
    expect(s.voiceActive).toBe(true);
  });

  it('selecting a scenario with openChannel=false leaves the channel untouched', () => {
    useDemoStore.getState().setChannel('chat');
    useDemoStore.getState().setScenario('melissa', false);
    expect(useDemoStore.getState().channel).toBe('chat');
    expect(useDemoStore.getState().scenario).toBe('melissa');
  });
});

describe('demoStore — advance()', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });

  it('plays a zero-delay user message immediately and increments the index', () => {
    useDemoStore.getState().setScenario('rachel');
    // Rachel's first line is a user message with delay 0.
    useDemoStore.getState().advance();
    const s = useDemoStore.getState();
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe('user');
    expect(s.messageIndex).toBe(1);
    expect(s.isTyping).toBe(false);
  });

  it('shows a typing indicator for a delayed agent message, then commits after the delay', () => {
    useDemoStore.getState().setScenario('rachel');
    useDemoStore.getState().advance(); // user line (index 0 -> 1)

    useDemoStore.getState().advance(); // agent line with delay 1200
    // During the delay the indicator is up but the message is not yet committed.
    expect(useDemoStore.getState().isTyping).toBe(true);
    expect(useDemoStore.getState().messages).toHaveLength(1);

    vi.advanceTimersByTime(1200);
    const s = useDemoStore.getState();
    expect(s.isTyping).toBe(false);
    expect(s.messages).toHaveLength(2);
    expect(s.messages[1].role).toBe('agent');
    expect(s.messageIndex).toBe(2);
  });

  it('is a no-op while typing (cannot double-advance during a delay)', () => {
    useDemoStore.getState().setScenario('rachel');
    useDemoStore.getState().advance(); // user
    useDemoStore.getState().advance(); // agent, now typing
    const indexDuringTyping = useDemoStore.getState().messageIndex;
    useDemoStore.getState().advance(); // should be ignored
    expect(useDemoStore.getState().messageIndex).toBe(indexDuringTyping);
  });

  it('does not advance past the end of the script', () => {
    useDemoStore.getState().setScenario('rachel');
    const len = SCRIPTS.rachel.length;
    // Drain the whole script, flushing each delay.
    for (let i = 0; i < len; i++) {
      useDemoStore.getState().advance();
      vi.runAllTimers();
    }
    expect(useDemoStore.getState().messageIndex).toBe(len);
    const before = useDemoStore.getState().messages.length;
    useDemoStore.getState().advance(); // past the end
    expect(useDemoStore.getState().messages.length).toBe(before);
  });

  it('does not advance in live mode', () => {
    useDemoStore.getState().setScenario('rachel');
    useDemoStore.getState().setMode('live');
    useDemoStore.getState().advance();
    expect(useDemoStore.getState().messages).toHaveLength(0);
  });

  it('starts the timer on first advance', () => {
    useDemoStore.getState().setScenario('rachel');
    expect(useDemoStore.getState().timerStart).toBeNull();
    useDemoStore.getState().advance();
    expect(useDemoStore.getState().timerStart).not.toBeNull();
  });
});

describe('demoStore — applySiteAction() (site reactivity)', () => {
  beforeEach(reset);

  it('navigate carries highlight into viewParams', () => {
    const action: SiteAction = { type: 'navigate', to: 'search', highlight: 'enchantment-resort' };
    useDemoStore.getState().applySiteAction(action);
    const s = useDemoStore.getState();
    expect(s.view).toBe('search');
    expect(s.viewParams.highlightId).toBe('enchantment-resort');
  });

  it('navigate to property infers propertyId from a prior highlight', () => {
    useDemoStore.getState().applySiteAction({
      type: 'navigate',
      to: 'search',
      highlight: 'lauberge-sedona',
    });
    useDemoStore.getState().applySiteAction({
      type: 'navigate',
      to: 'property',
      selectRoom: 'creekside-vista-cottage',
    });
    const s = useDemoStore.getState();
    expect(s.view).toBe('property');
    expect(s.viewParams.selectedRoomId).toBe('creekside-vista-cottage');
    expect(s.viewParams.propertyId).toBe('lauberge-sedona');
  });

  it('navigate to property infers propertyId from the room when no highlight is set', () => {
    useDemoStore.getState().applySiteAction({
      type: 'navigate',
      to: 'property',
      selectRoom: 'canyon-suite-ai', // belongs to mii-amo
    });
    expect(useDemoStore.getState().viewParams.propertyId).toBe('mii-amo');
  });

  it('navigate with booking data populates the confirmation', () => {
    useDemoStore.getState().applySiteAction({
      type: 'navigate',
      to: 'confirmation',
      data: {
        confirmationNumber: 'BK-7824091',
        property: 'Enchantment Resort',
        dates: 'Oct 16 – Oct 19, 2025',
        room: 'Canyon View Suite',
        total: '$1,017',
      },
    });
    const s = useDemoStore.getState();
    expect(s.view).toBe('confirmation');
    expect(s.booking?.confirmationNumber).toBe('BK-7824091');
    expect(s.booking?.total).toBe('$1,017');
  });

  it('updateConfirmation merges the add-on and new total onto an existing booking', () => {
    useDemoStore.getState().applySiteAction({
      type: 'navigate',
      to: 'confirmation',
      data: {
        confirmationNumber: 'BK-7824091',
        property: 'Enchantment Resort',
        dates: 'Oct 16 – Oct 19, 2025',
        room: 'Canyon View Suite',
        total: '$1,017',
      },
    });
    useDemoStore.getState().applySiteAction({
      type: 'updateConfirmation',
      addOn: 'Mii amo Journey Package',
      updatedTotal: '$1,492',
    });
    const s = useDemoStore.getState();
    expect(s.booking?.addOn).toBe('Mii amo Journey Package');
    expect(s.booking?.total).toBe('$1,492');
    expect(s.view).toBe('confirmation');
  });

  it('updateConfirmation is a no-op when there is no existing booking', () => {
    useDemoStore.getState().applySiteAction({
      type: 'updateConfirmation',
      addOn: 'Anything',
      updatedTotal: '$999',
    });
    expect(useDemoStore.getState().booking).toBeNull();
  });
});

describe('demoStore — live-mode message injection', () => {
  beforeEach(reset);

  it('pushUserMessage appends a user message and starts the timer', () => {
    useDemoStore.getState().pushUserMessage('I want a spa weekend');
    const s = useDemoStore.getState();
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe('user');
    expect(s.messages[0].text).toBe('I want a spa weekend');
    expect(s.timerStart).not.toBeNull();
  });

  it('pushAgentMessage clears typing and fires the embedded siteAction', () => {
    useDemoStore.getState().setTyping(true);
    useDemoStore.getState().pushAgentMessage({
      role: 'agent',
      text: 'Here is a match',
      delay: 0,
      capability: 'Personalized Matching',
      siteAction: { type: 'navigate', to: 'search', highlight: 'mii-amo' },
    });
    const s = useDemoStore.getState();
    expect(s.isTyping).toBe(false);
    expect(s.messages).toHaveLength(1);
    expect(s.view).toBe('search');
    expect(s.viewParams.highlightId).toBe('mii-amo');
  });
});

describe('demoStore — mobile sub-flow', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });

  it('triggerNotification selects melissa and sets the notification stage', () => {
    useDemoStore.getState().triggerNotification();
    const s = useDemoStore.getState();
    expect(s.scenario).toBe('melissa');
    expect(s.channel).toBe('mobile');
    expect(s.mobileStage).toBe('notification');
  });

  it('openMobileChat transitions splash -> chat after the splash delay', () => {
    useDemoStore.getState().openMobileChat();
    expect(useDemoStore.getState().mobileStage).toBe('splash');
    vi.advanceTimersByTime(700);
    expect(useDemoStore.getState().mobileStage).toBe('chat');
  });
});

describe('demoStore — July 4 turnkey demo', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
  });

  it('warm-starts the desktop Booking.com chat for the mock path', () => {
    useDemoStore.getState().startJuly4Demo('scripted');
    const s = useDemoStore.getState();
    expect(s.mode).toBe('scripted');
    expect(s.scenario).toBe('july4');
    expect(s.channel).toBe('chat');
    expect(s.mobileStage).toBe('home');
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe('agent');
    expect(s.messages[0].text).toContain("America's 250th");
    expect(s.messageIndex).toBe(0);
  });

  it('keeps the same warm start but switches turns to live mode for /demo/live', () => {
    useDemoStore.getState().startJuly4Demo('live');
    const s = useDemoStore.getState();
    expect(s.mode).toBe('live');
    expect(s.scenario).toBe('july4');
    expect(s.channel).toBe('chat');
    expect(s.mobileStage).toBe('home');
    expect(s.messages[0].text).toContain('flights, hotel, and things to do');
  });

  it('advances the mock chat by appending the typed user turn and next scripted response', () => {
    useDemoStore.getState().startJuly4Demo('scripted');
    useDemoStore.getState().submitScriptedTurn('Probably around $2,000 for everything');

    expect(useDemoStore.getState().messages.at(-1)?.role).toBe('user');
    expect(useDemoStore.getState().isTyping).toBe(true);

    vi.runOnlyPendingTimers();
    const s = useDemoStore.getState();
    expect(s.isTyping).toBe(false);
    expect(s.messages).toHaveLength(3);
    expect(s.messages[1].text).toBe('Probably around $2,000 for everything');
    expect(s.messages[2].card?.type).toBe('location_permission');
    expect(s.messageIndex).toBe(1);
  });

  it('can complete the full mock July 4 chat through confirmation', () => {
    useDemoStore.getState().startJuly4Demo('scripted');
    const replies = [
      'Probably around $2,000 for everything',
      'Allow location',
      '2 people',
      'Beach & coast',
      "Let's do the Vineyard — easy trip and we love it there",
      'This one — looks fun and the price is right',
      'JetBlue for sure',
      'The sunset cruise on July 4th sounds amazing, let’s do it',
      'Book This Trip',
      'Use my saved Visa and confirm',
    ];

    for (const reply of replies) {
      useDemoStore.getState().submitScriptedTurn(reply);
      vi.runOnlyPendingTimers();
    }

    const s = useDemoStore.getState();
    expect(s.messageIndex).toBe(SCRIPTS.july4.length);
    expect(s.booking?.confirmationNumber).toBe('BK-4JUL-29571');
    expect(s.booking?.total).toBe('$1,561');
    expect(s.view).toBe('confirmation');
    expect(s.messages.at(-1)?.text).toContain('BK-4JUL-29571');
  });
});

describe('demoStore — reset', () => {
  beforeEach(reset);

  it('resetScenario clears the conversation but keeps the selected scenario', () => {
    useDemoStore.getState().setScenario('rachel');
    useDemoStore.getState().pushUserMessage('hi');
    useDemoStore.getState().navigateTo('confirmation');
    useDemoStore.getState().resetScenario();
    const s = useDemoStore.getState();
    expect(s.scenario).toBe('rachel');
    expect(s.messages).toEqual([]);
    expect(s.messageIndex).toBe(0);
    expect(s.view).toBe('home');
    expect(s.booking).toBeNull();
    expect(s.timerStart).toBeNull();
  });
});
