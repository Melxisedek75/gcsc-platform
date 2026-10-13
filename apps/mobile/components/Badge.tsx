import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../lib/tokens';
import { useAppTheme } from '../lib/theme';

type Props = {
  label: string;
  color?: string;
  tone?: 'solid' | 'soft';
};

export function Badge({ label, color = colors.brand, tone = 'soft' }: Props) {
  useAppTheme();
  const bg = tone === 'solid' ? color : color + '22';
  const fg = tone === 'solid' ? colors.onBrand : colors.text;
  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', letterSpacing: 0 },
});
