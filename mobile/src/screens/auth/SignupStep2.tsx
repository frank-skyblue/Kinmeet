import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BirthdayField } from '../../components/common/BirthdayField';
import { Button } from '../../components/common/Button';
import { CityField } from '../../components/common/CityField';
import { CountryFlag, CountryWithFlag } from '../../components/common/CountryFlag';
import { FormField } from '../../components/common/FormField';
import { SelectField } from '../../components/common/SelectField';
import {
  COUNTRY_OPTIONS,
  HOME_COUNTRY_OPTIONS,
  SIGNUP_GENDER_OPTIONS,
  findProvinceCompositeValue,
  getCountryCode,
  getGlobalProvinceOptions,
  getProvinceOptions,
  parseProvinceComposite,
} from '../../constants/profileOptions';
import { ABOUT_MAX_LENGTH, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE } from '../../constants/validation';
import { dobIsoBoundsUtc } from '../../utils/age';
import type { ResolvedCityLocation } from '../../utils/citySearch';
import { getErrorMessage } from '../../utils/error';
import type { SignupStepProps } from './signupForm';

type SignupStep2Props = SignupStepProps & {
  onNext: () => void;
  onBack: () => void;
};

export const SignupStep2 = ({ form, onChange, setError, onNext, onBack }: SignupStep2Props) => {
  const { minIsoUtc, todayIsoUtc } = dobIsoBoundsUtc();

  const provinceOptions = form.manualCountryMode
    ? getProvinceOptions(form.currentCountryCode)
    : getGlobalProvinceOptions();

  const provinceValue = form.manualCountryMode
    ? form.currentProvince
    : findProvinceCompositeValue(form.currentCountryCode, form.currentProvince);

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

  const handlePickCity = (resolved: ResolvedCityLocation) => {
    onChange({
      currentCity: resolved.cityName,
      currentCountry: resolved.countryName,
      currentCountryCode: resolved.countryCode,
      currentProvince: resolved.provinceName,
      manualCountryMode: false,
    });
  };

  const handleCityTyped = () => {
    // A typed city no longer matches the country/province a picked suggestion filled in.
    if (!form.manualCountryMode) {
      onChange({ currentCountry: '', currentCountryCode: '', currentProvince: '' });
    }
  };

  const handleProvinceChange = (value: string) => {
    if (form.manualCountryMode) {
      onChange({ currentProvince: value });
      return;
    }
    const parsed = parseProvinceComposite(value);
    if (!parsed) return;
    onChange({
      currentCountry: parsed.countryName,
      currentCountryCode: parsed.countryCode,
      currentProvince: parsed.provinceName,
    });
  };

  const handleCountryChange = (countryName: string) => {
    onChange({
      currentCountry: countryName,
      currentCountryCode: getCountryCode(countryName),
      currentProvince: '',
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

    if (!form.currentCity.trim()) {
      missing.push('city');
    } else if (!form.currentCountry || !form.currentProvince) {
      setError(
        'Pick your city from the suggestions to fill country and province, or choose them manually below',
      );
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
      />

      {/* Current location */}
      <View className="mb-4 border-t border-kin-stone-300 pt-6">
        <Text className="mb-4 text-base font-semibold text-kin-navy">Where you live now</Text>

        <CityField
          label="City or town"
          required
          value={form.currentCity}
          onChangeText={(currentCity) => onChange({ currentCity })}
          onPickCity={handlePickCity}
          onManualEdit={handleCityTyped}
          helperText="Type a few letters and choose a match to fill country and province below"
        />

        <SelectField
          label={form.manualCountryMode ? 'Province/State' : 'Province/State (search worldwide)'}
          required
          options={provinceOptions}
          value={provinceValue}
          onChange={handleProvinceChange}
          placeholder={form.manualCountryMode ? 'e.g., Ontario' : 'e.g., Ontario, Canada'}
          disabled={form.manualCountryMode && !form.currentCountryCode}
          helperText={
            form.manualCountryMode
              ? 'Pick your country first if needed, then province'
              : 'Choosing a row sets your country and province together'
          }
        />

        {form.manualCountryMode ? (
          <>
            <SelectField
              label="Country"
              required
              leading={<CountryFlag country={form.currentCountry} />}
              options={COUNTRY_OPTIONS}
              value={form.currentCountry}
              onChange={handleCountryChange}
              placeholder="e.g., Canada"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange({ manualCountryMode: false })}
              className="self-start active:opacity-70"
            >
              <Text className="text-sm font-semibold text-kin-teal underline">
                Use worldwide province list instead
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="rounded-xl border border-kin-stone-300 bg-kin-beige px-4 py-3">
            <Text className="mb-1 text-sm font-medium text-kin-navy">Country</Text>
            {form.currentCountry ? (
              <CountryWithFlag country={form.currentCountry} />
            ) : (
              <Text className="text-[16px] text-kin-navy">—</Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pick country and province manually"
              onPress={() => onChange({ manualCountryMode: true })}
              className="mt-2 self-start active:opacity-70"
            >
              <Text className="text-sm font-semibold text-kin-teal underline">
                Change country or province manually
              </Text>
            </Pressable>
          </View>
        )}
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
