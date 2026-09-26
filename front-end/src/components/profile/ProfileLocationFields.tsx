import React from 'react';
import SearchableSelect from '../common/SearchableSelect';
import CitySearchInput from '../common/CitySearchInput';
import CountryFlag from '../common/CountryFlag';
import CountryWithFlag from '../common/CountryWithFlag';
import {
  COUNTRY_OPTIONS,
  getGlobalProvinceOptions,
  getProvinceOptions,
  findProvinceCompositeValue,
} from '../../constants/profileOptions';
import type { ResolvedCityLocation } from '../../utils/citySearch';

type ProfileLocationFieldsProps = {
  currentCity: string;
  setCurrentCity: React.Dispatch<React.SetStateAction<string>>;
  currentCountry: string;
  currentCountryCode: string;
  currentProvince: string;
  setCurrentProvince: React.Dispatch<React.SetStateAction<string>>;
  manualCountryMode: boolean;
  setManualCountryMode: React.Dispatch<React.SetStateAction<boolean>>;
  onPickCityResolved: (resolved: ResolvedCityLocation) => void;
  onCurrentCountryChange: (countryName: string) => void;
  applyProvinceFromComposite: (composite: string) => void;
};

const ProfileLocationFields: React.FC<ProfileLocationFieldsProps> = ({
  currentCity,
  setCurrentCity,
  currentCountry,
  currentCountryCode,
  currentProvince,
  setCurrentProvince,
  manualCountryMode,
  setManualCountryMode,
  onPickCityResolved,
  onCurrentCountryChange,
  applyProvinceFromComposite,
}) => {
  const provinceOptions = manualCountryMode
    ? getProvinceOptions(currentCountryCode)
    : getGlobalProvinceOptions();

  const provinceSelectValue = manualCountryMode
    ? currentProvince
    : findProvinceCompositeValue(currentCountryCode, currentProvince);

  const handleProvinceChange = (val: string) => {
    if (manualCountryMode) {
      setCurrentProvince(val);
      return;
    }
    applyProvinceFromComposite(val);
  };

  return (
    <div className="space-y-4 border-t border-kin-stone-200 pt-4">
      <p className="text-sm font-semibold font-montserrat text-kin-navy">
        Where you live now
      </p>
      <CitySearchInput
        id="profileCurrentCity"
        label="City or town (optional)"
        currentCity={currentCity}
        setCurrentCity={setCurrentCity}
        onPickCity={onPickCityResolved}
        helperText="Type a few letters and choose a match to fill country and province"
      />
      <SearchableSelect
        id="currentProvince"
        label={
          manualCountryMode
            ? 'Province/State'
            : 'Province/State (search worldwide)'
        }
        options={provinceOptions}
        value={provinceSelectValue}
        onChange={handleProvinceChange}
        placeholder={manualCountryMode ? 'e.g., Ontario' : 'e.g., Ontario, Canada'}
        disabled={manualCountryMode && !currentCountryCode}
        required
        searchable="typeahead"
        helperText={
          manualCountryMode
            ? 'Pick your country first if needed, then province'
            : 'Choosing a row sets your country and province together'
        }
      />
      {!manualCountryMode ? (
        <div className="rounded-kin-sm border border-kin-stone-200 bg-kin-stone-50 px-4 py-3">
          <p className="text-sm font-medium font-inter text-kin-navy mb-1">Country</p>
          <p className="text-kin-navy font-inter">
            {currentCountry ? (
              <CountryWithFlag country={currentCountry} />
            ) : (
              '—'
            )}
          </p>
          <button
            type="button"
            onClick={() => setManualCountryMode(true)}
            className="mt-2 text-sm font-semibold text-kin-teal hover:text-kin-teal-700 cursor-pointer underline"
            aria-label="Pick country and province manually"
          >
            Change country or province manually
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <SearchableSelect
            id="currentCountry"
            label="Where You Live Now (Country)"
            options={COUNTRY_OPTIONS}
            value={currentCountry}
            onChange={onCurrentCountryChange}
            placeholder="e.g., Canada"
            required
            searchable="typeahead"
            leadingContent={<CountryFlag country={currentCountry} />}
          />
          <button
            type="button"
            onClick={() => setManualCountryMode(false)}
            className="text-sm font-semibold text-kin-teal hover:text-kin-teal-700 cursor-pointer underline"
            aria-label="Use worldwide province list instead"
          >
            Use worldwide province list instead
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileLocationFields;
