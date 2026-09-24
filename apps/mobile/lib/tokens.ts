export const colors = {
  bg: '#F6F8F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F1',
  border: '#CCD5D4',
  text: '#172421',
  textMuted: '#4E625C',
  textDim: '#596C66',
  brand: '#A64200',
  brandDark: '#803300',
  onBrand: '#FFFFFF',
  accent: '#08734F',
  warning: '#856000',
  danger: '#B3261E',
  homeowner: '#005B9A',
  contractor: '#A64200',
} as const;

export const radius = {
  sm: 8,
  md: 8,
  lg: 8,
  xl: 16,
  pill: 999,
} as const;

export const control = {
  minTouch: 48,
  primaryHeight: 56,
  contentMaxWidth: 760,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: 0 },
  h1: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: 0 },
  h2: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: 0 },
  h3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0 },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  micro: { fontSize: 12, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0 },
} as const;
