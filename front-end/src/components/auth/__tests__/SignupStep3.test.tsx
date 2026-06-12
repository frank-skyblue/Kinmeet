import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupStep3 from '../SignupStep3';

const graduationYears = [2024, 2023, 2022];

const renderStep3 = (overrides: Partial<{
  industry: string;
  institution: string;
  graduationYear: string;
}> = {}) => {
  const props = {
    industry: '',
    setIndustry: vi.fn(),
    institution: '',
    setInstitution: vi.fn(),
    graduationYear: '',
    setGraduationYear: vi.fn(),
    graduationYears,
    onNext: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };

  render(<SignupStep3 {...props} />);
  return props;
};

describe('SignupStep3', () => {
  it('shows industry field instead of job title and company', () => {
    renderStep3();

    expect(screen.getByLabelText(/industry or field of work/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/job title/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument();
  });

  it('keeps education fields', () => {
    renderStep3();

    expect(screen.getByLabelText(/institution name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/graduation year/i)).toBeInTheDocument();
  });

  it('calls onNext when Next is clicked', async () => {
    const user = userEvent.setup();
    const props = renderStep3();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(props.onNext).toHaveBeenCalled();
  });

  it('calls onBack when Back is clicked', async () => {
    const user = userEvent.setup();
    const props = renderStep3();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(props.onBack).toHaveBeenCalled();
  });
});
