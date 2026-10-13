import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../lib/tokens';
import { useAppTheme } from '../lib/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: Props) {
  useAppTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[typography.h1, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, marginBottom: spacing.sm },
});
