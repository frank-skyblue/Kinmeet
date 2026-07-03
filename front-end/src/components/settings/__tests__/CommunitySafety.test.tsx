import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import CommunitySafety from '../CommunitySafety';

describe('CommunitySafety', () => {
  it('renders heading and back link', () => {
    render(
      <MemoryRouter>
        <CommunitySafety />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /community & safety/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to settings and privacy/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('renders Community Guidelines section with all guidelines', () => {
    render(
      <MemoryRouter>
        <CommunitySafety />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /community guidelines/i })).toBeInTheDocument();
    expect(screen.getByText(/treat all members with respect and kindness/i)).toBeInTheDocument();
    expect(screen.getByText(/celebrate cultural diversity and inclusivity/i)).toBeInTheDocument();
    expect(screen.getByText(/report inappropriate behavior or content/i)).toBeInTheDocument();
  });
});
