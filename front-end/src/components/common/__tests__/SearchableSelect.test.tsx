import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchableSelect from '../SearchableSelect';

const options = [
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'ca', label: 'Canada' },
];

const defaultProps = {
  id: 'country',
  label: 'Country',
  options,
  value: '',
  onChange: vi.fn(),
};

describe('SearchableSelect', () => {
  it('renders label and placeholder', () => {
    render(<SearchableSelect {...defaultProps} placeholder="Select country" />);
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Select country')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('selects an option on click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('France'));

    expect(onChange).toHaveBeenCalledWith('fr');
  });

  it('displays selected value', () => {
    render(<SearchableSelect {...defaultProps} value="de" />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('filters options with searchable input', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} searchable={true} />);

    await user.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type to search...');
    await user.type(input, 'Fra');

    expect(screen.getByText('France')).toBeInTheDocument();
    expect(screen.queryByText('Germany')).not.toBeInTheDocument();
  });

  it('shows "No results found" when no match', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} searchable={true} />);

    await user.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Type to search...');
    await user.type(input, 'xyz');

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect {...defaultProps} disabled />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
