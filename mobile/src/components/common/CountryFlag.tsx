import { Text } from 'react-native';
import { getCountryFlag } from '../../constants/profileOptions';

type CountryFlagProps = {
  country?: string;
};

/** Flag emoji for a country name (web CountryFlag). Renders nothing for an unknown country. */
export const CountryFlag = ({ country }: CountryFlagProps) => {
  const flag = country ? getCountryFlag(country) : '';
  if (!flag) return null;
  return (
    <Text accessible={false} className="text-[18px]">
      {flag}
    </Text>
  );
};

type CountryWithFlagProps = {
  country?: string;
  className?: string;
};

/** Flag followed by the country name (web CountryWithFlag). */
export const CountryWithFlag = ({ country, className = '' }: CountryWithFlagProps) => {
  if (!country?.trim()) return null;
  return (
    <Text className={`text-[16px] text-kin-navy ${className}`}>
      {getCountryFlag(country) ? `${getCountryFlag(country)} ` : ''}
      {country.trim()}
    </Text>
  );
};
