import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';
import type { RenderedMessage } from '../../lib/types';

afterEach(cleanup);

function agentMessage(text: string): RenderedMessage {
  return {
    id: 'message-1',
    ts: 1,
    role: 'agent',
    text,
    delay: 0,
    capability: 'Live',
  };
}

describe('ChatBubble', () => {
  it('renders live markdown emphasis and recommendation lists', () => {
    render(
      <ChatBubble
        message={agentMessage(
          "**Martha's Vineyard, MA:** Classic New England coastline.\n" +
            '* **Outer Banks, NC:** Wide beaches and quiet coastal charm.',
        )}
      />,
    );

    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText("Martha's Vineyard, MA:").tagName).toBe('STRONG');
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      'Outer Banks, NC: Wide beaches and quiet coastal charm.',
    );
  });
});
