import { MD3LightTheme, MD3Theme } from 'react-native-paper';
import { colors } from './tokens';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 2,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand,
    onPrimary: colors.onBrand,
    primaryContainer: '#FFEADA',
    onPrimaryContainer: colors.brandDark,
    secondary: colors.accent,
    onSecondary: colors.onBrand,
    background: colors.bg,
    surface: colors.surface,
    surfaceVariant: colors.surfaceAlt,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    onBackground: colors.text,
    outline: colors.textDim,
    outlineVariant: colors.border,
    error: colors.danger,
    onError: colors.onBrand,
  },
  fonts: Object.fromEntries(
    Object.entries(MD3LightTheme.fonts).map(([key, value]) => [key, { ...value, letterSpacing: 0 }]),
  ) as MD3Theme['fonts'],
};
