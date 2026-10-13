import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { loadSettings, UserSettings } from './settings';
import { setActiveColors } from './tokens';

type ThemePreference = UserSettings['theme'];

let preference: ThemePreference = 'system';
let systemDark = Appearance.getColorScheme() === 'dark';
let revision = 0;
const listeners = new Set<() => void>();

function emit(): void {
  setActiveColors(preference === 'dark' || (preference === 'system' && systemDark));
  revision += 1;
  listeners.forEach(listener => listener());
}

export function applyThemePreference(next: ThemePreference): void {
  if (preference === next) return;
  preference = next;
  emit();
}

export async function initializeTheme(): Promise<void> {
  const saved = (await loadSettings()).theme;
  if (saved === preference) emit();
  else applyThemePreference(saved);
}

Appearance.addChangeListener(({ colorScheme }) => {
  const nextDark = colorScheme === 'dark';
  if (systemDark === nextDark) return;
  systemDark = nextDark;
  if (preference === 'system') emit();
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppTheme(): { dark: boolean; preference: ThemePreference } {
  useSyncExternalStore(subscribe, () => revision, () => revision);
  return { dark: preference === 'dark' || (preference === 'system' && systemDark), preference };
}
