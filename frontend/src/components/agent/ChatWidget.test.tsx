import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChatWidget } from './ChatWidget';

afterEach(cleanup);

// The chat is the centerpiece of the demo, so the widget must greet visitors
// expanded — not hidden behind a launcher bubble.
describe('ChatWidget', () => {
  it('opens the chat window expanded on initial mount', () => {
    render(<ChatWidget />);

    // The expanded window shows the message input and a Send button; the
    // collapsed launcher would only show an "Open ... Assistant" button.
    expect(screen.getByLabelText('Type a message')).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Open Booking.com Assistant'),
    ).not.toBeInTheDocument();
  });

  it('exposes a control to minimize the window', () => {
    render(<ChatWidget />);
    expect(screen.getByLabelText('Minimize chat')).toBeInTheDocument();
  });

  it('renders the expanded chat as a large primary demo surface', () => {
    render(<ChatWidget />);

    expect(screen.getByTestId('booking-chat-window')).toHaveClass(
      'w-[560px]',
      'min-h-[620px]',
    );
  });
});
