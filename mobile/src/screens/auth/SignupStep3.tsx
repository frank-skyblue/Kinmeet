import { Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { SelectField } from '../../components/common/SelectField';
import { EDUCATION_LEVEL_OPTIONS, INDUSTRY_OPTIONS } from '../../constants/profileOptions';
import type { SignupForm, SignupFormChange } from './signupForm';

type SignupStep3Props = {
  form: SignupForm;
  onChange: SignupFormChange;
  onNext: () => void;
  onBack: () => void;
};

// Graduation year is hidden on the web too (FE-030), so it isn't collected here.
export const SignupStep3 = ({ form, onChange, onNext, onBack }: SignupStep3Props) => {
  return (
    <View className="w-full">
      <Text className="mb-1 text-xl font-bold text-kin-navy">Work & education</Text>
      <Text className="mb-6 text-sm text-kin-stone-500">
        These fields are optional but help others get to know you better.
      </Text>

      <Text className="mb-3 text-base font-semibold text-kin-navy">Work</Text>
      <SelectField
        label="Industry or field of work"
        options={INDUSTRY_OPTIONS}
        value={form.industry}
        onChange={(industry) => onChange({ industry })}
        placeholder="Select your industry"
      />

      <Text className="mb-3 mt-2 text-base font-semibold text-kin-navy">Education</Text>
      <SelectField
        label="Education level"
        options={EDUCATION_LEVEL_OPTIONS}
        value={form.educationLevel}
        onChange={(educationLevel) => onChange({ educationLevel })}
        placeholder="Select education level"
      />

      <View className="mt-2 flex-row gap-3">
        <Button label="Back" variant="secondary" onPress={onBack} className="flex-1" />
        <Button label="Next" onPress={onNext} className="flex-1" />
      </View>
    </View>
  );
};
