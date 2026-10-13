import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ActivityIndicator, TouchableRipple } from 'react-native-paper';
import { colors, control, radius, spacing, typography } from '../lib/tokens';
import { useAppTheme } from '../lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', fullWidth, disabled, loading = false, accessibilityLabel, style }: Props) {
  useAppTheme();
  const palette = paletteFor(variant);
  const inactive = Boolean(disabled || loading || !onPress);
  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        fullWidth && styles.full,
        inactive && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.indicator}>
          {loading ? <ActivityIndicator size={18} color={palette.fg} /> : null}
        </View>
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        <View style={styles.indicator} />
      </View>
    </TouchableRipple>
  );
}

function paletteFor(v: Variant) {
  switch (v) {
    case 'secondary':
      return { bg: colors.surfaceAlt, fg: colors.text, border: colors.border };
    case 'ghost':
      return { bg: 'transparent', fg: colors.brand, border: 'transparent' };
    case 'danger':
      return { bg: colors.danger, fg: colors.onBrand, border: colors.danger };
    default:
      return { bg: colors.brand, fg: colors.onBrand, border: colors.brand };
  }
}

const styles = StyleSheet.create({
  base: {
    minHeight: control.primaryHeight,
    minWidth: control.minTouch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  full: { width: '100%' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  indicator: { width: 18, height: 18 },
  label: { ...typography.bodyStrong, flexShrink: 1, textAlign: 'center' },
});
