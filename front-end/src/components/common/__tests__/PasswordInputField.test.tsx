import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInputField from '../PasswordInputField';

describe('PasswordInputField', () => {
  it('renders a password input and show-password toggle', () => {
    render(
      <label>
        Password
        <PasswordInputField id="password" value="" setPassword={vi.fn()} />
      </label>,
    );

    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  it('toggles visibility and updates the button label', async () => {
    const user = userEvent.setup();
    const setPassword = vi.fn();

    render(
      <label>
        Password
        <PasswordInputField id="password" value="secret" setPassword={setPassword} />
      </label>,
    );

    const input = screen.getByLabelText(/^password$/i);
    const toggle = screen.getByRole('button', { name: 'Show password' });

    await user.click(toggle);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });
});
