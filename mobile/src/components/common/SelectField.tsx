import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SelectOption } from '../../types';
import { PLACEHOLDER_COLOR, fieldBoxClass } from './FormField';
import { FieldLabel } from './FieldLabel';

const OPTION_HEIGHT = 52;
/** Lists longer than this get a search box. */
const SEARCH_THRESHOLD = 10;

type SelectFieldProps = {
  /** Shown above the box; also the sheet's title. Pass hideLabel to keep it off the form. */
  label: string;
  required?: boolean;
  hideLabel?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /** Shown before the selected value, e.g. a country flag (web SearchableSelect's leadingContent). */
  leading?: ReactNode;
  /** Spacing/size for the outer wrapper, e.g. "flex-1" in a row. Defaults to the standard field gap. */
  className?: string;
};

/** Mobile replacement for the web SearchableSelect: a field that opens a searchable bottom sheet. */
export const SelectField = ({
  label,
  required = false,
  hideLabel = false,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  helperText,
  disabled = false,
  leading,
  className = 'mb-4',
}: SelectFieldProps) => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = options.find((option) => option.value === value)?.label;
  const isSearchable = options.length > SEARCH_THRESHOLD;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    close();
  };

  return (
    <View className={className}>
      {hideLabel ? null : <FieldLabel label={label} required={required} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel ?? 'Not selected' }}
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        className={`h-12 flex-row items-center justify-between ${fieldBoxClass(isOpen)} ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        {selectedLabel && leading ? <View className="mr-2">{leading}</View> : null}
        <Text
          numberOfLines={1}
          className={`flex-1 text-[16px] ${selectedLabel ? 'text-kin-navy' : 'text-kin-stone-500'}`}
        >
          {selectedLabel ?? placeholder}
        </Text>
        <Text className="ml-2 text-kin-stone-500">▾</Text>
      </Pressable>
      {helperText ? <Text className="mt-1 text-xs text-kin-stone-500">{helperText}</Text> : null}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between border-b border-kin-stone-300 px-6 py-4">
            <Text accessibilityRole="header" className="flex-1 text-lg font-bold text-kin-navy">
              {label}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={close}>
              <Text className="text-base font-semibold text-kin-coral">Close</Text>
            </Pressable>
          </View>

          {isSearchable ? (
            <View className="px-6 pt-4">
              <TextInput
                accessibilityLabel={`Search ${label}`}
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={PLACEHOLDER_COLOR}
                autoCorrect={false}
                autoFocus
                className={`h-12 ${fieldBoxClass(false)} text-[16px] text-kin-navy`}
              />
            </View>
          ) : null}

          <FlatList
            data={filteredOptions}
            keyExtractor={(option) => option.value}
            keyboardShouldPersistTaps="handled"
            getItemLayout={(_, index) => ({ length: OPTION_HEIGHT, offset: OPTION_HEIGHT * index, index })}
            contentContainerClassName="px-6 py-2"
            ListEmptyComponent={
              <Text className="py-6 text-center text-kin-stone-500">No matches</Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => handleSelect(item.value)}
                  style={{ height: OPTION_HEIGHT }}
                  className="flex-row items-center justify-between border-b border-kin-stone-300/50 active:bg-kin-beige"
                >
                  <Text
                    numberOfLines={1}
                    className={`flex-1 text-[16px] ${
                      isSelected ? 'font-semibold text-kin-coral' : 'text-kin-navy'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected ? <Text className="ml-2 text-kin-coral">✓</Text> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};
