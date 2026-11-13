import { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BirthdayField } from '../../components/common/BirthdayField';
import { Button } from '../../components/common/Button';
import { CityField } from '../../components/common/CityField';
import { CountryFlag } from '../../components/common/CountryFlag';
import { FormField } from '../../components/common/FormField';
import { SelectField } from '../../components/common/SelectField';
import {
  COUNTRY_OPTIONS,
  HOME_COUNTRY_OPTIONS,
  NO_PROVINCE,
  SIGNUP_GENDER_OPTIONS,
  getCountryCode,
  getProvinceOptions,
} from '../../constants/profileOptions';
import { ABOUT_MAX_LENGTH, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE } from '../../constants/validation';
import { dobIsoBoundsUtc } from '../../utils/age';
import { getCityProvinces, type ResolvedCityLocation } from '../../utils/citySearch';
import { getErrorMessage } from '../../utils/error';
import type { SignupStepProps } from './signupForm';

type SignupStep2Props = SignupStepProps & {
  onNext: () => void;
  onBack: () => void;
};

export const SignupStep2 = ({ form, onChange, setError, onNext, onBack }: SignupStep2Props) => {
  const { minIsoUtc, todayIsoUtc } = dobIsoBoundsUtc();

  const countryProvinceOptions = getProvinceOptions(form.currentCountryCode);
  // Countries without subdivisions in the data (e.g. Aruba) get a single "no subdivision" option.
  const countryHasProvinces = countryProvinceOptions.some((option) => option.value !== NO_PROVINCE);

  // A known city limits the province to the one(s) it's actually in: Toronto → Ontario only.
  const cityProvinces = useMemo(
    () => (countryHasProvinces ? getCityProvinces(form.currentCity, form.currentCountryCode) : []),
    [countryHasProvinces, form.currentCity, form.currentCountryCode],
  );
  const provinceOptions =
    cityProvinces.length > 0
      ? countryProvinceOptions.filter((option) => cityProvinces.includes(option.value))
      : countryProvinceOptions;
  const isProvinceSetByCity = cityProvinces.length === 1;

  // ---- Photo ----

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const type = asset.mimeType ?? 'image/jpeg';
      if (asset.fileSize !== undefined && asset.fileSize > MAX_PHOTO_SIZE) {
        setError('Image must be under 5 MB');
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(type)) {
        setError('Only JPEG, PNG, WebP, and GIF images are allowed');
        return;
      }
      setError('');
      onChange({
        photo: {
          uri: asset.uri,
          type,
          name: asset.fileName ?? `profile.${type.split('/')[1] ?? 'jpg'}`,
        },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to open your photos. Please try again.'));
    }
  };

  // ---- Location ----

  const handleCountryChange = (countryName: string) => {
    if (countryName === form.currentCountry) return;
    const countryCode = getCountryCode(countryName);
    const hasProvinces = getProvinceOptions(countryCode).some((option) => option.value !== NO_PROVINCE);
    // City and province belonged to the previous country.
    onChange({
      currentCountry: countryName,
      currentCountryCode: countryCode,
      currentCity: '',
      currentProvince: hasProvinces ? '' : NO_PROVINCE,
    });
  };

  /** Keeps the province consistent with a typed city: fills it in, or clears one the city isn't in. */
  const handleCityChange = (currentCity: string) => {
    if (!countryHasProvinces) {
      onChange({ currentCity });
      return;
    }
    const provinces = getCityProvinces(currentCity, form.currentCountryCode);
    if (provinces.length === 1) {
      onChange({ currentCity, currentProvince: provinces[0] });
    } else if (provinces.length > 1 && !provinces.includes(form.currentProvince)) {
      onChange({ currentCity, currentProvince: '' });
    } else {
      onChange({ currentCity });
    }
  };

  const handlePickCity = (resolved: ResolvedCityLocation) => {
    // Only fill the province if it's one the picker knows, so the field never shows a value it can't list.
    const isKnownProvince = countryProvinceOptions.some(
      (option) => option.value === resolved.provinceName,
    );
    onChange({
      currentCity: resolved.cityName,
      ...(isKnownProvince ? { currentProvince: resolved.provinceName } : {}),
    });
  };

  // ---- Validation ----

  const validate = (): boolean => {
    const missing: string[] = [];
    if (!form.firstName.trim()) missing.push('first name');
    if (!form.lastName.trim()) missing.push('last name');
    if (!form.homeCountry) missing.push('home country');
    if (!form.dateOfBirth.trim()) missing.push('date of birth');
    if (!form.gender.trim()) missing.push('gender');

    if (!form.currentCountry) missing.push('country you live in');
    if (!form.currentCity.trim()) missing.push('city');
    if (!form.currentProvince) missing.push('province/state');

    // Backstop for the UI rule above: a known city must be in the chosen province.
    if (
      form.currentProvince &&
      cityProvinces.length > 0 &&
      !cityProvinces.includes(form.currentProvince)
    ) {
      setError(`${form.currentCity.trim()} is not in ${form.currentProvince}. Choose ${cityProvinces.join(' or ')}.`);
      return false;
    }

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`);
      return false;
    }

    const dob = form.dateOfBirth.trim();
    if (dob > todayIsoUtc || dob < minIsoUtc) {
      setError('Invalid date of birth');
      return false;
    }
    if (form.about.length > ABOUT_MAX_LENGTH) {
      setError(`About section must be ${ABOUT_MAX_LENGTH} characters or fewer`);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validate()) onNext();
  };

  return (
    <View className="w-full">
      <Text className="mb-4 text-xl font-bold text-kin-navy">Profile information</Text>

      {/* Photo */}
      <View className="mb-6 items-center">
        {form.photo ? (
          <Image
            source={{ uri: form.photo.uri }}
            accessibilityLabel="Profile photo preview"
            className="h-24 w-24 rounded-full border-4 border-kin-stone-300"
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-kin-stone-300 bg-kin-beige">
            <Text className="text-3xl">📷</Text>
          </View>
        )}
        <View className="mt-3 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={form.photo ? 'Change photo' : 'Add photo'}
            onPress={handlePickPhoto}
            className="rounded-xl border border-kin-teal px-4 py-2 active:bg-kin-teal-100"
          >
            <Text className="text-sm font-semibold text-kin-teal">
              {form.photo ? 'Change photo' : 'Add photo'}
            </Text>
          </Pressable>
          {form.photo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => onChange({ photo: null })}
              className="rounded-xl border border-kin-coral-200 px-4 py-2 active:bg-kin-coral-50"
            >
              <Text className="text-sm font-semibold text-kin-coral-700">Remove</Text>
            </Pressable>
          ) : null}
        </View>
        <Text className="mt-2 text-xs text-kin-stone-500">
          Optional. JPEG, PNG, WebP, or GIF. Max 5 MB.
        </Text>
      </View>

      {/* Name */}
      <FormField
        label="First name"
        required
        value={form.firstName}
        onChangeText={(firstName) => onChange({ firstName })}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <FormField
        label="Last name"
        required
        helperText="Hidden until kin request is accepted"
        value={form.lastName}
        onChangeText={(lastName) => onChange({ lastName })}
        autoComplete="family-name"
        textContentType="familyName"
      />

      <FormField
        label="About you"
        helperText={`${form.about.length}/${ABOUT_MAX_LENGTH} characters`}
        value={form.about}
        onChangeText={(about) => onChange({ about })}
        placeholder="Tell others a bit about yourself..."
        multiline
        maxLength={ABOUT_MAX_LENGTH}
      />

      <SelectField
        label="Your home country"
        required
        leading={<CountryFlag country={form.homeCountry} />}
        options={HOME_COUNTRY_OPTIONS}
        value={form.homeCountry}
        onChange={(homeCountry) => onChange({ homeCountry })}
        placeholder="e.g., Nigeria"
        helperText="The country where you were born or raised"
        renderOptionLeading={(option) => <CountryFlag country={option.value}/>}
      />

      {/* Current location */}
      <View className="mb-4 border-t border-kin-stone-300 pt-6">
        <Text className="mb-4 text-base font-semibold text-kin-navy">Where you live now</Text>

        <SelectField
          label="Country"
          required
          options={COUNTRY_OPTIONS}
          value={form.currentCountry}
          onChange={handleCountryChange}
          placeholder="e.g., Canada"
          leading={<CountryFlag country={form.currentCountry} />}
          renderOptionLeading={(option) => <CountryFlag country={option.value} />}
        />

        <CityField
          label="City or town"
          required
          countryCode={form.currentCountryCode}
          value={form.currentCity}
          onChangeText={handleCityChange}
          onPickCity={handlePickCity}
          helperText="Type a few letters and choose a match to fill in your province"
        />

        {/* Hidden for countries without provinces; their province is saved as "N/A". */}
        {!form.currentCountryCode || countryHasProvinces ? (
          <SelectField
            label="Province/State"
            required
            options={provinceOptions}
            value={form.currentProvince}
            onChange={(currentProvince) => onChange({ currentProvince })}
            placeholder={form.currentCountryCode ? 'e.g., Ontario' : 'Choose a country first'}
            disabled={!form.currentCountryCode || isProvinceSetByCity}
            helperText={
              isProvinceSetByCity
                ? `Set from your city. ${form.currentCity.trim()} is only in ${cityProvinces[0]}.`
                : cityProvinces.length > 1
                  ? `${form.currentCity.trim()} is in more than one province/state. Choose yours.`
                  : undefined
            }
          />
        ) : null}
      </View>

      <BirthdayField
        label="Date of birth"
        required
        value={form.dateOfBirth}
        minIsoDate={minIsoUtc}
        maxIsoDate={todayIsoUtc}
        onChange={(dateOfBirth) => onChange({ dateOfBirth })}
      />

      <SelectField
        label="Gender"
        required
        options={SIGNUP_GENDER_OPTIONS}
        value={form.gender}
        onChange={(gender) => onChange({ gender })}
        placeholder="Select gender"
      />

      <View className="mt-2 flex-row gap-3">
        <Button label="Back" variant="secondary" onPress={onBack} className="flex-1" />
        <Button label="Next" onPress={handleNext} className="flex-1" />
      </View>
    </View>
  );
};
