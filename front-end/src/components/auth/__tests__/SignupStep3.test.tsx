import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupStep3 from '../SignupStep3';

const GRADUATION_YEARS = [2026, 2025, 2024];

const defaultProps = {
  jobTitle: '',
  setJobTitle: vi.fn(),
  company: '',
  setCompany: vi.fn(),
  educationLevel: '',
  setEducationLevel: vi.fn(),
  graduationYear: '',
  setGraduationYear: vi.fn(),
  graduationYears: GRADUATION_YEARS,
  onNext: vi.fn(),
  onBack: vi.fn(),
};

describe('SignupStep3', () => {
  it('renders Work & Education heading', () => {
    render(<SignupStep3 {...defaultProps} />);
    expect(screen.getByText('Work & Education')).toBeInTheDocument();
  });

  it('renders the Education Level dropdown with all options', async () => {
    const user = userEvent.setup();
    render(<SignupStep3 {...defaultProps} />);

    await user.click(screen.getByRole('combobox', { name: /education level/i }));

    expect(screen.getByRole('option', { name: "Bachelor's Degree" })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: "Master's Degree" })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'High School' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Trade School' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });

  it('does not render an institution text input', () => {
    render(<SignupStep3 {...defaultProps} />);
    expect(screen.queryByLabelText(/institution/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/university of toronto/i)).not.toBeInTheDocument();
  });

  it('calls setEducationLevel when a value is selected', async () => {
    const setEducationLevel = vi.fn();
    const user = userEvent.setup();
    render(<SignupStep3 {...defaultProps} setEducationLevel={setEducationLevel} />);

    await user.click(screen.getByRole('combobox', { name: /education level/i }));
    await user.click(screen.getByRole('option', { name: "Bachelor's Degree" }));

    expect(setEducationLevel).toHaveBeenCalledWith("Bachelor's Degree");
  });

  it('shows the currently selected education level', () => {
    render(<SignupStep3 {...defaultProps} educationLevel="Master's Degree" />);
    expect(screen.getByText("Master's Degree")).toBeInTheDocument();
  });

  it('does not render graduation year field', () => {
    render(<SignupStep3 {...defaultProps} />);
    expect(screen.queryByRole('combobox', { name: /graduation year/i })).not.toBeInTheDocument();
  });

  it('calls onNext when Next is clicked', async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<SignupStep3 {...defaultProps} onNext={onNext} />);
    await user.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onBack when Back is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<SignupStep3 {...defaultProps} onBack={onBack} />);
    await user.click(screen.getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });
});
