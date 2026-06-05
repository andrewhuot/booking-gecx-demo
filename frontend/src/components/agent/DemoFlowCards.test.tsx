import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChoiceGroupCard } from './DemoFlowCards';
import type { ChoiceGroupCardData } from '../../lib/types';

afterEach(cleanup);

describe('ChoiceGroupCard', () => {
  it('renders real imagery for July 4 card options', () => {
    const data: ChoiceGroupCardData = {
      type: 'choice_group',
      variant: 'destination',
      title: 'July 4th beach destinations',
      layout: 'cards',
      options: [
        {
          id: 'marthas-vineyard',
          title: "Martha's Vineyard, MA",
          imageLabel: 'Menemsha harbor at golden hour',
          replyText: "Let's do the Vineyard",
        },
        {
          id: 'outer-banks',
          title: 'Outer Banks, NC',
          imageLabel: 'Wild horses on a wide, empty beach',
          replyText: 'Show me the Outer Banks',
        },
        {
          id: 'summercamp',
          title: 'Summercamp Hotel',
          imageLabel: 'Retro Oak Bluffs hotel lounge',
          replyText: 'Choose Summercamp Hotel',
        },
        {
          id: 'jetblue',
          title: 'JetBlue',
          imageLabel: 'JetBlue aircraft at the gate',
          replyText: 'JetBlue for sure',
        },
        {
          id: 'sunset-sailing',
          title: 'Sunset Sailing Cruise',
          imageLabel: 'Sailboat in Edgartown Harbor at sunset',
          replyText: 'Add the sunset sailing cruise',
        },
      ],
    };

    render(<ChoiceGroupCard data={data} />);

    expect(
      screen.getByRole('img', { name: 'Menemsha harbor at golden hour' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Retro Oak Bluffs hotel lounge' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'JetBlue aircraft at the gate' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Sailboat in Edgartown Harbor at sunset' }),
    ).toBeInTheDocument();
  });
});
