import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import SettingsPrivacy from '../SettingsPrivacy';

describe('SettingsPrivacy', () => {
  it('renders hub title and Account section link', () => {
    render(
      <MemoryRouter>
        <SettingsPrivacy />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /settings & privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /account:/i })).toHaveAttribute(
      'href',
      '/settings/account',
    );
  });
});
