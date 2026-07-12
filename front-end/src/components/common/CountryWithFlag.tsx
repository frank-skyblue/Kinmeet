import React from 'react';
import CountryFlag from './CountryFlag';
import { getCountryCode } from '../../utils/countryFlags';

type CountryWithFlagProps = {
  country?: string;
  className?: string;
};

const CountryWithFlag: React.FC<CountryWithFlagProps> = ({ country, className = '' }) => {
  if (!country?.trim()) return null;

  const trimmed = country.trim();
  const code = getCountryCode(trimmed);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {code ? <CountryFlag country={trimmed} /> : null}
      <span>{trimmed}</span>
    </span>
  );
};

export default CountryWithFlag;
