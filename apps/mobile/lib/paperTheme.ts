import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';
import { darkColors, lightColors } from './tokens';

export function paperThemeFor(dark: boolean): MD3Theme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const colors = dark ? darkColors : lightColors;
  return {
  ...base,
  roundness: 2,
  colors: {
    ...base.colors,
    primary: colors.brand,
    onPrimary: colors.onBrand,
    primaryContainer: dark ? '#263D72' : '#FFEADA',
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
    Object.entries(base.fonts).map(([key, value]) => [key, { ...value, letterSpacing: 0 }]),
  ) as MD3Theme['fonts'],
  };
}
