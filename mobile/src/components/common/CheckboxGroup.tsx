import { Pressable, Text, View } from 'react-native';
import { FieldLabel } from './FieldLabel';

type CheckboxGroupProps = {
  label: string;
  required?: boolean;
  options: string[];
  selected: string[];
  onChange: (updated: string[]) => void;
};

/** Multi-select list of tappable rows with a checkbox each (web LookingForCheckboxes). */
export const CheckboxGroup = ({
  label,
  required = false,
  options,
  selected,
  onChange,
}: CheckboxGroupProps) => {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  };

  return (
    <View className="mb-4">
      <FieldLabel label={label} required={required} />
      <View className="gap-2">
        {options.map((option) => {
          const isChecked = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityLabel={option}
              accessibilityState={{ checked: isChecked }}
              onPress={() => toggle(option)}
              className={`h-12 flex-row items-center rounded-xl border px-4 active:opacity-80 ${
                isChecked ? 'border-kin-coral bg-kin-coral-50' : 'border-kin-stone-300 bg-white'
              }`}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  isChecked ? 'border-kin-coral bg-kin-coral' : 'border-kin-stone-500 bg-white'
                }`}
              >
                {isChecked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
              </View>
              <Text className="ml-3 text-[16px] text-kin-navy">{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
