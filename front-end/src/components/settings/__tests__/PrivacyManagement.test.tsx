import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import PrivacyManagement from '../PrivacyManagement';

describe('PrivacyManagement', () => {
  it('renders heading and back link', () => {
    render(
      <MemoryRouter>
        <PrivacyManagement />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to settings and privacy/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('renders the Blocked Accounts section link', () => {
    render(
      <MemoryRouter>
        <PrivacyManagement />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /blocked accounts:/i })).toHaveAttribute(
      'href',
      '/settings/privacy/blocked-accounts',
    );
  });
});
