import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useDemoStore } from './store/demoStore';

const INITIAL = useDemoStore.getState();

function resetStore() {
  useDemoStore.setState(INITIAL, true);
}

describe('App July 4 desktop demo routing', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ cxas_reachable: false }),
      })),
    );
    window.history.pushState({}, '', '/google');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('clicks the fake Google ad into the desktop Booking.com chat warm start', () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole('link', {
        name: /Booking\.com — July 4th Weekend Getaways/i,
      }),
    );

    expect(window.location.pathname).toBe('/demo/mock');
    expect(screen.getByLabelText('Type a message')).toBeInTheDocument();
    expect(screen.getByText(/America's 250th/i)).toBeInTheDocument();
    expect(screen.queryByText('Assistant • online')).not.toBeInTheDocument();
  });

  it('renders a richer Google-style results page for the ad warm start', () => {
    render(<App />);

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue(
      'July 4th getaway',
    );
    expect(screen.getByText('Sponsored results')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /Booking\.com.*July 4th Weekend Getaways/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Cheap 4th of July Getaways/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Best Fourth of July Weekend Getaways/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('AI Mode')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('advances the desktop mock chat through the first typed user turn', async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole('link', {
        name: /Booking\.com — July 4th Weekend Getaways/i,
      }),
    );
    fireEvent.change(screen.getByLabelText('Type a message'), {
      target: { value: 'Probably around $2,000 for everything' },
    });
    fireEvent.click(screen.getByLabelText('Send message'));

    expect(screen.getByText('Probably around $2,000 for everything')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByText(/sharing your location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allow' })).toBeInTheDocument();
  });
});
