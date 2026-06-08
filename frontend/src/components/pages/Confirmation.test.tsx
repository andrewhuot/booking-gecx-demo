import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Confirmation } from './Confirmation';
import { useDemoStore } from '../../store/demoStore';

const INITIAL = useDemoStore.getState();

function resetStore() {
  useDemoStore.setState(INITIAL, true);
}

describe('Confirmation page', () => {
  beforeEach(resetStore);
  afterEach(cleanup);

  it('shows the confirmed hotel, flight, and activity itinerary details', () => {
    useDemoStore.setState({
      booking: {
        confirmationNumber: 'BK-4JUL-29571',
        property: 'Summercamp Hotel',
        dates: 'Jul 3 - Jul 6, 2026',
        room: 'Two guests · 3 nights',
        total: '$1,561',
        itinerarySections: [
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
        ],
      },
    });

    render(<Confirmation />);

    expect(screen.getByText('Your booking is confirmed!')).toBeInTheDocument();
    expect(screen.getByText('Hotel')).toBeInTheDocument();
    expect(screen.getByText('Flights')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('JFK → MVY · Nonstop')).toBeInTheDocument();
    expect(screen.getByText('Jul 3 · 9:15 AM → 10:05 AM')).toBeInTheDocument();
    expect(screen.getByText('Jul 6 · 6:30 PM → 7:25 PM')).toBeInTheDocument();
    expect(screen.getByText('Sunset Sailing Cruise')).toBeInTheDocument();
    expect(screen.getByText('Edgartown Harbor')).toBeInTheDocument();
    expect(screen.getByText('$1,561')).toBeInTheDocument();
  });
});
