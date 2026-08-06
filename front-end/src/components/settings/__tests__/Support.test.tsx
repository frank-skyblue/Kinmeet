import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import Support from '../Support';

describe('Support', () => {
  it('renders heading and back link', () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /support/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to settings and privacy/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('renders Give Feedback section link', () => {
    render(
      <MemoryRouter>
        <Support />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /give feedback:/i })).toHaveAttribute(
      'href',
      '/settings/support/feedback',
    );
  });
});
