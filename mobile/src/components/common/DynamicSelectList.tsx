import { Pressable, Text, View } from 'react-native';
import type { SelectOption } from '../../types';
import { SelectField } from './SelectField';
import { FieldLabel } from './FieldLabel';

type DynamicSelectListProps = {
  label: string;
  required?: boolean;
  /** Singular name for one row, used in sheet titles and button labels, e.g. "Language". */
  itemName: string;
  items: string[];
  options: SelectOption[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  placeholder?: string;
};

/** A list of selects with Add/Remove, like the web DynamicListField. */
export const DynamicSelectList = ({
  label,
  required = false,
  itemName,
  items,
  options,
  onAdd,
  onRemove,
  onChange,
  placeholder,
}: DynamicSelectListProps) => {
  return (
    <View className="mb-4">
      <FieldLabel label={label} required={required} />
      {items.map((item, index) => (
        <View key={index} className="mb-2 flex-row items-center gap-2">
          <SelectField
            label={itemName}
            hideLabel
            // Hide values already picked in other rows.
            options={options.filter(
              (option) =>
                option.value === item ||
                !items.some((existing, i) => i !== index && existing === option.value),
            )}
            value={item}
            onChange={(value) => onChange(index, value)}
            placeholder={placeholder}
            className="flex-1"
          />
          {items.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${itemName.toLowerCase()} ${index + 1}`}
              onPress={() => onRemove(index)}
              className="h-12 justify-center rounded-xl bg-kin-coral-100 px-4 active:opacity-80"
            >
              <Text className="font-medium text-kin-coral-700">Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${itemName.toLowerCase()}`}
        onPress={onAdd}
        className="self-start py-2 active:opacity-70"
      >
        <Text className="font-semibold text-kin-teal">+ Add {itemName}</Text>
      </Pressable>
    </View>
  );
};
