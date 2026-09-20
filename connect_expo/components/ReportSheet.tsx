import { Brand } from '@/constants/Colors';
import { PrimaryButton } from '@/components/PrimaryButton';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REASONS = ['Abusive', 'Harassment', 'Pornography', 'Other'] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

/** Flutter `ReportWidget` — reason list + optional Other description. */
export function ReportSheet({ visible, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(-1);
  const [otherText, setOtherText] = useState('');

  function reset() {
    setSelected(-1);
    setOtherText('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    const reason =
      selected === 3
        ? otherText.trim()
        : selected >= 0
          ? REASONS[selected]
          : '';
    if (!reason) return;
    onSubmit(reason);
    reset();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 12) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.title}>Report</Text>

          {selected === 3 ? (
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor="#9E9E9E"
              value={otherText}
              onChangeText={setOtherText}
              multiline
              autoFocus
            />
          ) : (
            <View style={styles.list}>
              {REASONS.map((label, i) => (
                <Pressable
                  key={label}
                  onPress={() => {
                    setSelected(i);
                    if (label !== 'Other') setOtherText('');
                  }}
                  style={styles.row}
                >
                  <Text style={styles.rowText}>
                    {selected === i ? '✓ ' : ''}
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 16 }} />
          <PrimaryButton label="Submit" onPress={handleSubmit} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Brand.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.textPrimary,
    marginBottom: 16,
  },
  list: {
    gap: 4,
  },
  row: {
    paddingVertical: 10,
  },
  rowText: {
    fontSize: 16,
    color: Brand.textPrimary,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: Brand.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Brand.textPrimary,
    textAlignVertical: 'top',
  },
});
