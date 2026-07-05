import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountryWithFlag from '../CountryWithFlag';

describe('CountryWithFlag', () => {
  it('renders flag and country name when resolved', () => {
    const { container } = render(<CountryWithFlag country="Canada" />);
    expect(container.querySelector('.fi-ca')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('renders country text only when code cannot be resolved', () => {
    const { container } = render(<CountryWithFlag country="Not A Real Country" />);
    expect(container.querySelector('[class*="fi-"]')).not.toBeInTheDocument();
    expect(screen.getByText('Not A Real Country')).toBeInTheDocument();
  });

  it('renders nothing when country is empty', () => {
    const { container } = render(<CountryWithFlag country="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
