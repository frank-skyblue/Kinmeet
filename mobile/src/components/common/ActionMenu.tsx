import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

type ActionMenuProps = {
  /** Screen-reader label for the "…" button, e.g. "More actions for Marie". */
  label: string;
  items: ActionMenuItem[];
};

/** "…" button that opens a bottom sheet of actions (web ActionMenu). */
export const ActionMenu = ({ label, items }: ActionMenuProps) => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const select = (item: ActionMenuItem) => {
    setIsOpen(false);
    item.onSelect();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-kin-beige"
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.navy} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => setIsOpen(false)}
          className="flex-1 justify-end bg-black/40"
        >
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable
            className="rounded-t-3xl bg-white px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-kin-stone-300" />
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ disabled: item.disabled }}
                disabled={item.disabled}
                onPress={() => select(item)}
                className={`h-14 justify-center border-b border-kin-stone-300/50 px-2 active:bg-kin-beige ${
                  item.disabled ? 'opacity-50' : ''
                }`}
              >
                <Text
                  className={`text-[16px] ${
                    item.variant === 'destructive' ? 'font-semibold text-kin-coral-700' : 'text-kin-navy'
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setIsOpen(false)}
              className="h-14 justify-center px-2 active:bg-kin-beige"
            >
              <Text className="text-[16px] font-semibold text-kin-navy">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
