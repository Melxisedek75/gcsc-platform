import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { isWalletProbeLink } from '../../../packages/wallet-proof/probe-support.mjs';
import { shouldClearAppSession } from '../../../packages/wallet-proof/session-restore.mjs';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Button } from '../components/Button';
import { fetchProfile } from '../lib/auth';
import { AuthUser, clearSession, loadSession } from '../lib/api';
import { initI18n } from '../lib/i18n';
import { hasCompletedOnboarding } from '../lib/onboarding';
import { loadWebauthSession, primeSessionFromBackend } from '../lib/webauth';
import { colors } from '../lib/tokens';
import { paperThemeFor } from '../lib/paperTheme';
import { initializeTheme, useAppTheme } from '../lib/theme';

type HydrationState = 'pending' | 'ready' | 'retry';

export default function RootLayout() {
  const router = useRouter();
  const [state, setState] = useState<HydrationState>('pending');
  const [retryKey, setRetryKey] = useState(0);
  const theme = useAppTheme();

  useEffect(() => { void initializeTheme(); }, []);

  useEffect(() => {
    let cancelled = false;
    let retryNeeded = false;

    async function hydrate() {
      try {
        if (isWalletProbeLink(await Linking.getInitialURL(), process.env.EXPO_PUBLIC_WALLET_PROBE === '1')) return;
        await initI18n();
        const { token } = await loadSession();
        if (!token) {
          const seen = await hasCompletedOnboarding();
          if (cancelled) return;
          if (!seen) {
            router.replace('/onboarding' as never);
          }
          return;
        }
        let profile: AuthUser;
        try {
          profile = await fetchProfile();
        } catch (error) {
          if (cancelled) return;
          if (shouldClearAppSession(error)) await clearSession();
          else retryNeeded = true;
          return;
        }
        if (cancelled) return;
        if (profile.wallet?.account) {
          const local = await loadWebauthSession();
          if (cancelled) return;
          if (!local || local.account !== profile.wallet.account) {
            await primeSessionFromBackend(
              profile.wallet.account,
              profile.wallet.permission ?? 'active',
            );
          }
        }
        const target = profile.role === 'contractor' ? '/(contractor)/jobs' : '/(homeowner)/jobs';
        router.replace(target);
      } finally {
        clearTimeout(failsafe);
        if (!cancelled) setState(retryNeeded ? 'retry' : 'ready');
      }
    }

    // A stalled profile request must leave credentials intact and expose retry.
    const failsafe = setTimeout(() => {
      if (!cancelled) setState('retry');
    }, 4000);

    void hydrate();
    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  }, [router, retryKey]);

  return (
    <PaperProvider theme={paperThemeFor(theme.dark)} settings={{
      icon: ({ name, color, size }) => <MaterialCommunityIcons name={name as keyof typeof MaterialCommunityIcons.glyphMap} color={color} size={size} />,
    }}>
    <ErrorBoundary>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="dispute" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="wallet-probe" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(homeowner)" />
          <Stack.Screen name="(contractor)" />
        </Stack>
        {state === 'pending' ? (
          // pointerEvents="auto" so taps don't leak through the opaque loading
          // overlay to the (still-mounting) screen underneath during bootstrap.
          <View pointerEvents="auto" style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
        {state === 'retry' ? (
          <View pointerEvents="auto" style={styles.retryOverlay}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>
              Could not restore your session. Check your connection and try again.
            </Text>
            <Button label="Retry" onPress={() => {
              setState('pending');
              setRetryKey(value => value + 1);
            }} />
          </View>
        ) : null}
      </View>
    </ErrorBoundary>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  retryOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: colors.bg,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
});
