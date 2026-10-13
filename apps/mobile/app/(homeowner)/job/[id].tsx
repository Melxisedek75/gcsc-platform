import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Header } from '../../../components/Header';
import { Screen } from '../../../components/Screen';
import { BackendProject, formatBudget, getBackendProject, publishBackendProject } from '../../../lib/jobs';
import { colors, spacing, typography } from '../../../lib/tokens';

function statusLabel(project: BackendProject): string {
  if (!project.published) return 'Private draft';
  if (project.status === 'in_progress') return 'In progress';
  if (project.status === 'completed') return 'Completed';
  return 'Published';
}

export default function JobDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<BackendProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const result = await getBackendProject(id);
      setJob(result?.project ?? null);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function handlePublish() {
    if (!job || busy) return;
    setBusy(true);
    try {
      setJob(await publishBackendProject(job.id));
    } catch (err) {
      Alert.alert('Could not publish job', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <Header title={loadError ? 'Could not load job' : 'Job not found'} subtitle={loadError || 'This job may have been removed.'} />
        {loadError ? <Button label="Retry" fullWidth onPress={load} /> : null}
        <Button label="Back to my jobs" fullWidth onPress={() => router.replace('/(homeowner)/jobs')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={job.title} subtitle={statusLabel(job)} />

      {loadError ? <Text style={[typography.body, { color: colors.danger }]}>{loadError}</Text> : null}

      <Card>
        <View style={styles.row}>
          <Badge label={job.category.toUpperCase()} color={colors.homeowner} />
          <Badge label={statusLabel(job)} color={job.published ? colors.accent : colors.textMuted} />
        </View>

        <View style={styles.detail}>
          <Text style={[typography.micro, { color: colors.textDim }]}>Budget</Text>
          <Text style={[typography.h3, { color: colors.text }]}>{formatBudget(job)}</Text>
        </View>

        {job.location ? (
          <View style={styles.detail}>
            <Text style={[typography.micro, { color: colors.textDim }]}>Location</Text>
            <Text style={[typography.body, { color: colors.text }]}>{job.location}</Text>
          </View>
        ) : null}

        <View style={styles.detail}>
          <Text style={[typography.micro, { color: colors.textDim }]}>{job.published ? 'Published' : 'Created'}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {new Date(job.published_at || job.created_at).toLocaleString()}
          </Text>
        </View>

        {job.description ? (
          <View style={styles.detail}>
            <Text style={[typography.micro, { color: colors.textDim }]}>Description</Text>
            <Text style={[typography.body, { color: colors.text }]}>{job.description}</Text>
          </View>
        ) : null}
      </Card>

      <View style={{ gap: spacing.sm }}>
        {!job.published ? (
          <Button label={busy ? 'Publishing…' : 'Publish job'} fullWidth disabled={busy} onPress={handlePublish} />
        ) : (
          <Button label="View bids" fullWidth onPress={() => router.push(`/(homeowner)/job/${job.id}/bids` as never)} />
        )}
        <Button
          label="Back to my jobs"
          fullWidth
          variant="ghost"
          onPress={() => router.replace('/(homeowner)/jobs')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  detail: { gap: spacing.xs, marginTop: spacing.md },
});
