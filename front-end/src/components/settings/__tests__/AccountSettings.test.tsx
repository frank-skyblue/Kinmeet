import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import AccountSettings from '../AccountSettings';

vi.mock('../../profile/DeleteAccountModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Delete Account Modal</div> : null,
}));

describe('AccountSettings', () => {
  it('renders account section with delete action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountSettings />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /^account$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to settings and privacy/i })).toHaveAttribute(
      'href',
      '/settings',
    );

    await user.click(screen.getByRole('button', { name: /delete account/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
