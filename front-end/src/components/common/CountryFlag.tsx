import React from 'react';
import { getCountryCode } from '../../utils/countryFlags';

type CountryFlagProps = {
  country?: string;
  className?: string;
};

const CountryFlag: React.FC<CountryFlagProps> = ({ country, className = '' }) => {
  const code = getCountryCode(country);
  if (!code) return null;

  return (
    <span
      className={`fi fi-${code} inline-block w-5 h-4 rounded-sm shrink-0 ${className}`.trim()}
      aria-hidden
    />
  );
};

export default CountryFlag;
