import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { ApiError, getCurrentUser, saveSession, getToken } from '../../lib/api';
import { bindWallet } from '../../lib/auth';
import { colors, spacing, typography } from '../../lib/tokens';

export default function ConnectWallet() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeBinding = useRef<AbortController | null>(null);
  useEffect(() => () => { activeBinding.current?.abort(); }, []);

  async function handleConnect() {
    if (submitting || activeBinding.current) return;
    const controller = new AbortController();
    activeBinding.current = controller;
    setError(null);
    setSubmitting(true);
    try {
      const token = getToken();
      const userId = getCurrentUser()?.id;
      const updated = await bindWallet(controller.signal);
      if (controller.signal.aborted) return;
      if (!token || getToken() !== token || getCurrentUser()?.id !== userId || updated.id !== userId) {
        throw new Error('wallet_binding_session_changed');
      }
      await saveSession(token, updated);
      if (controller.signal.aborted || getToken() !== token || getCurrentUser()?.id !== userId) return;
      const target = updated.role === 'contractor' ? '/(contractor)/jobs' : '/(homeowner)/jobs';
      router.replace(target);
    } catch (err) {
      if (controller.signal.aborted) return;
      const apiErr = err as ApiError | Error;
      setError(apiErr.message ?? 'Failed to connect wallet');
    } finally {
      if (activeBinding.current === controller) activeBinding.current = null;
      if (!controller.signal.aborted) setSubmitting(false);
    }
  }

  function handleSkip() {
    activeBinding.current?.abort();
    const user = getCurrentUser();
    const target = user?.role === 'contractor' ? '/(contractor)/jobs' : '/(homeowner)/jobs';
    router.replace(target);
  }

  return (
    <Screen>
      <Header
        title="Connect your wallet"
        subtitle="Sign payments with WebAuth — your XPR testnet account is the payment signer."
      />

      <View style={styles.info}>
        <Text style={[typography.body, { color: colors.text }]}>
          You&apos;ll need the WebAuth app installed. After tapping Connect, WebAuth will open and
          ask you to approve the pairing.
        </Text>
        {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
      </View>

      <View style={styles.actions}>
        <Button
          label={submitting ? 'Waiting for WebAuth…' : 'Connect WebAuth'}
          fullWidth
          onPress={handleConnect}
          disabled={submitting}
        />
        <Text
          style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}
          onPress={handleSkip}
        >
          Skip for now
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { gap: spacing.sm },
  actions: { gap: spacing.md },
});
