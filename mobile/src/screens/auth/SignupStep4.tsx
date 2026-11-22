import { Text, View } from 'react-native';
import { Button } from '../../components/common/Button';
import { CheckboxGroup } from '../../components/common/CheckboxGroup';
import { DynamicSelectList } from '../../components/common/DynamicSelectList';
import {
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  LOOKING_FOR_OPTIONS,
} from '../../constants/profileOptions';
import type { SignupStepProps } from './signupForm';

type SignupStep4Props = SignupStepProps & {
  isLoading: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

/** Add/remove/change helpers for a list field that always keeps at least one (possibly empty) row. */
const listHandlers = (items: string[], save: (next: string[]) => void) => ({
  onAdd: () => save([...items, '']),
  onRemove: (index: number) => {
    const next = items.filter((_, i) => i !== index);
    save(next.length > 0 ? next : ['']);
  },
  onChange: (index: number, value: string) =>
    save(items.map((item, i) => (i === index ? value : item))),
});

export const SignupStep4 = ({
  form,
  onChange,
  setError,
  isLoading,
  onBack,
  onSubmit,
}: SignupStep4Props) => {
  const validate = (): boolean => {
    if (!form.languages.some((language) => language.trim() !== '')) {
      setError('At least one language is required');
      return false;
    }
    if (form.lookingFor.length === 0) {
      setError('Please select what you are looking for');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    setError('');
    if (validate()) onSubmit();
  };

  return (
    <View className="w-full">
      <Text className="mb-4 text-xl font-bold text-kin-navy">Languages & interests</Text>

      <DynamicSelectList
        label="Languages spoken"
        required
        itemName="Language"
        items={form.languages}
        options={LANGUAGE_OPTIONS}
        placeholder="Select a language"
        {...listHandlers(form.languages, (languages) => onChange({ languages }))}
      />

      <DynamicSelectList
        label="Personal interests (optional)"
        itemName="Interest"
        items={form.interests}
        options={INTEREST_OPTIONS}
        placeholder="Select an interest"
        {...listHandlers(form.interests, (interests) => onChange({ interests }))}
      />

      <CheckboxGroup
        label="Looking for (select all that apply)"
        required
        options={LOOKING_FOR_OPTIONS}
        selected={form.lookingFor}
        onChange={(lookingFor) => onChange({ lookingFor })}
      />

      <View className="mt-2 flex-row gap-3">
        <Button
          label="Back"
          variant="secondary"
          onPress={onBack}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          label="Complete signup"
          loadingLabel="Creating..."
          onPress={handleSubmit}
          isLoading={isLoading}
          className="flex-[1.5]"
        />
      </View>
    </View>
  );
};
