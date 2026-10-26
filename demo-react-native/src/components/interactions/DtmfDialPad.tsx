import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';

import { Dialog } from '@/components/ui/Dialog';
import { colors, fontSize, radius, spacing } from '@/theme';

const DTMF_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const DTMF_LETTERS: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '*': '',
  '0': '+',
  '#': '',
};

interface DtmfDialPadProps {
  open: boolean;
  onDigitPress: (digit: string) => void;
  onClose: () => void;
}

/**
 * DtmfDialPad — 3x4 keypad for in-call DTMF.
 *
 * Presented as a modal rather than demo-app's floating popover: on a phone there is
 * no room to anchor a panel beside the control bar, and a sheet keeps the digits at
 * a comfortable tap size.
 */
export function DtmfDialPad({ open, onDigitPress, onClose }: DtmfDialPadProps) {
  const [input, setInput] = useState('');

  const handleDigitPress = (digit: string) => {
    setInput((prev) => prev + digit);
    onDigitPress(digit);
  };

  const handleClose = () => {
    setInput('');
    onClose();
  };

  return (
    <Dialog open={open} title="Dial Pad" onClose={handleClose}>
      <View style={styles.inputRow}>
        <Text style={styles.inputText} numberOfLines={1} accessibilityLabel="DTMF digits entered">
          {input || '...'}
        </Text>
        {input.length > 0 && (
          <Pressable
            onPress={() => setInput('')}
            accessibilityRole="button"
            accessibilityLabel="Clear DTMF input"
            hitSlop={8}
          >
            <Delete size={18} color={colors.gray500} />
          </Pressable>
        )}
      </View>

      <View style={styles.grid}>
        {DTMF_DIGITS.map((digit) => (
          <Pressable
            key={digit}
            onPress={() => handleDigitPress(digit)}
            accessibilityRole="button"
            accessibilityLabel={`Send DTMF ${digit}`}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyDigit}>{digit}</Text>
            {DTMF_LETTERS[digit] ? (
              <Text style={styles.keyLetters}>{DTMF_LETTERS[digit]}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.lg,
  },
  inputText: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.gray900,
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  key: {
    width: '31%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
  },
  keyPressed: {
    backgroundColor: colors.gray200,
  },
  keyDigit: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray900,
  },
  keyLetters: {
    fontSize: fontSize.xxs,
    color: colors.gray400,
    letterSpacing: 1.5,
  },
});
