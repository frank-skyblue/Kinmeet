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

const toggleLinkClass =
  'cursor-pointer font-inter text-sm font-medium text-foreground underline decoration-primary underline-offset-4 transition hover:text-primary-hover';

/**
 * Where the user lives now. By default one worldwide province search sets both province and
 * country; "Choose country and province separately" switches to picking them one at a time.
 */
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
    <div className="space-y-5">
      <div>
        <h3 className="font-montserrat text-lg font-bold text-foreground">Where You Live Now</h3>
        <p className="mt-1 font-inter text-sm text-muted">Enter the location where you currently live.</p>
      </div>

      <CitySearchInput
        id="profileCurrentCity"
        label="Current City or Town (Optional)"
        currentCity={currentCity}
        setCurrentCity={setCurrentCity}
        onPickCity={onPickCityResolved}
        helperText="Choosing your current city fills in your current province and country."
      />

      {manualCountryMode ? (
        <>
          <SearchableSelect
            id="currentCountry"
            label="Current Country"
            options={COUNTRY_OPTIONS}
            value={currentCountry}
            onChange={onCurrentCountryChange}
            placeholder="e.g., Canada"
            required
            searchable="typeahead"
            leadingContent={<CountryFlag country={currentCountry} />}
          />
          <SearchableSelect
            id="currentProvince"
            label="Current Province / State"
            options={provinceOptions}
            value={provinceSelectValue}
            onChange={handleProvinceChange}
            placeholder={currentCountryCode ? 'e.g., Ontario' : 'Choose a country first'}
            disabled={!currentCountryCode}
            required
            searchable="typeahead"
          />
          <button type="button" onClick={() => setManualCountryMode(false)} className={toggleLinkClass}>
            Search provinces worldwide
          </button>
        </>
      ) : (
        <>
          <SearchableSelect
            id="currentProvince"
            label="Current Province / State (Worldwide)"
            options={provinceOptions}
            value={provinceSelectValue}
            onChange={handleProvinceChange}
            placeholder="e.g., Ontario, Canada"
            required
            searchable="typeahead"
          />
          <div className="flex items-center justify-between gap-3 rounded-kin-sm bg-surface-muted px-4 py-3 font-inter">
            <span className="min-w-0 text-foreground">
              {currentCountry ? <CountryWithFlag country={currentCountry} /> : '—'}
            </span>
            <span className="shrink-0 text-sm text-muted">Current Country</span>
          </div>
          <button type="button" onClick={() => setManualCountryMode(true)} className={toggleLinkClass}>
            Choose country and province separately
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileLocationFields;
