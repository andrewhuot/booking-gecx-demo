import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Homepage } from './Homepage';

afterEach(cleanup);

describe('Homepage', () => {
  it('keeps the hero-overlapping search shell above hero media layers', () => {
    render(<Homepage />);

    expect(screen.getByTestId('homepage-search-shell')).toHaveClass('relative', 'z-10');
  });
});
