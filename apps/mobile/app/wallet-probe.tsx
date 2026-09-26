import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { Screen } from '../components/Screen';
import { connectProbeWallet, probeApi, probeErrorMessage, WALLET_PROBE_ENABLED, type ProbeSession } from '../lib/wallet-probe';
import { type OwnershipChallenge } from '../../../packages/wallet-proof/request-proof.mjs';
import { colors, spacing, typography } from '../lib/tokens';

export default function WalletProbe() {
  const [session, setSession] = useState<ProbeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [shape, setShape] = useState('Not received');
  const [launch, setLaunch] = useState('Not sent');
  const [error, setError] = useState('');
  const alive = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; controller.current?.abort(); };
  }, []);

  async function connect() {
    if (busy) return;
    setBusy(true); setSession(null); setShape('Not received'); setError(''); setStage('Checking USB service');
    try {
      await probeApi('status');
      if (!alive.current) return;
      setStage('Waiting for WebAuth pairing');
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const connected = await Promise.race([
          connectProbeWallet(
            summary => {
              if (alive.current) setShape(`${summary.signatureType} / ${summary.serializedBytes} bytes / ${summary.format}`);
            },
            summary => {
              if (alive.current) setLaunch(`${summary.transport} / ${summary.uriLength} chars / ${summary.scheme}`);
            },
          ),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('probe_timeout')), 90000); }),
        ]);
        if (alive.current) { setSession(connected); setStage('Paired; ownership not yet checked'); }
      } finally { clearTimeout(timer); }
    } catch (err) { if (alive.current) { setError(probeErrorMessage(err)); setStage('Pairing incomplete'); } }
    finally { if (alive.current) setBusy(false); }
  }

  async function sign() {
    if (busy || !session) return;
    setBusy(true); setError(''); setStage('Creating one-time challenge');
    controller.current = new AbortController();
    try {
      const challenge = await probeApi<OwnershipChallenge>('challenge', {
        accountName: session.accountName, permission: session.permission,
      });
      if (!alive.current) return;
      setStage('Waiting for sign-only approval');
      const proof = await session.sign(challenge, controller.current.signal);
      if (!alive.current) return;
      setStage('Checking exact signed bytes');
      await probeApi('proof', proof);
      if (alive.current) setStage('Signature received; exact bytes verified');
    } catch (err) { if (alive.current) { setError(probeErrorMessage(err)); setStage('Proof incomplete'); } }
    finally { if (alive.current) setBusy(false); }
  }

  return <Screen>
    <Header title="WebAuth diagnostics" subtitle="SmartContractor USB / XPR Testnet" />
    {!WALLET_PROBE_ENABLED ? <Text style={styles.error}>Diagnostics disabled in this build.</Text> : <>
      <View style={styles.rows}>
        <Text style={styles.label}>Connection</Text><Text style={styles.value}>{stage}</Text>
        <Text style={styles.label}>Account</Text><Text style={styles.value}>{session ? `${session.accountName}@${session.permission}` : 'Not paired'}</Text>
        <Text style={styles.label}>Wallet response</Text><Text style={styles.value}>{shape}</Text>
        <Text style={styles.label}>Wallet request</Text><Text style={styles.value}>{launch}</Text>
        <Text style={styles.label}>Application login</Text><Text style={styles.value}>Not granted</Text>
        <Text style={styles.label}>Payments</Text><Text style={styles.value}>None. Broadcast disabled.</Text>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button label="Connect WebAuth" fullWidth loading={busy && !session} disabled={busy} onPress={connect} />
      <Button label="Sign ownership proof" fullWidth disabled={busy || !session} loading={busy && !!session} onPress={sign} />
      {busy && !!session && <Button label="Cancel proof" variant="secondary" fullWidth onPress={() => controller.current?.abort()} />}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  rows: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  value: { ...typography.body, color: colors.text, flexShrink: 1 },
  error: { ...typography.body, color: colors.danger },
});
