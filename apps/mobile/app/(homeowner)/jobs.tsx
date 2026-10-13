import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { BackendProject, formatBudget, listMyBackendProjects, timeAgoIso } from '../../lib/jobs';
import { colors, spacing, typography } from '../../lib/tokens';

function statusLabel(project: BackendProject): string {
  if (!project.published) return 'Draft';
  if (project.status === 'in_progress') return 'In progress';
  if (project.status === 'completed') return 'Completed';
  return 'Published';
}

export default function HomeownerJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<BackendProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJobs(await listMyBackendProjects());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const active = jobs.filter((j) => j.published && j.status === 'open').length;
  const inProgress = jobs.filter((j) => j.status === 'in_progress').length;
  const completed = jobs.filter((j) => j.status === 'completed').length;

  if (isLoading) {
    return <Screen><ActivityIndicator color={colors.brand} /></Screen>;
  }

  return (
    <Screen>
      <Header title="My jobs" subtitle="Track posted projects and contractor activity" />

      <View style={styles.summary}>
        <SummaryStat label="Active" value={String(active)} color={colors.accent} />
        <SummaryStat label="In progress" value={String(inProgress)} color={colors.brand} />
        <SummaryStat label="Completed" value={String(completed)} color={colors.textMuted} />
      </View>

      <Button label="Post a new job" fullWidth onPress={() => router.push('/(homeowner)/post-job')} />

      {loadError ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.body, { color: colors.danger }]}>{loadError}</Text>
          <Button label="Retry" fullWidth onPress={load} />
        </View>
      ) : null}

      {jobs.length === 0 && !loadError ? (
        <Card variant="alt">
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            No jobs yet. Post your first project to make it visible to contractors.
          </Text>
        </Card>
      ) : !loadError ? (
        <View style={{ gap: spacing.md }}>
          {jobs.map((j) => (
            <Pressable
              key={j.id}
              onPress={() => router.push(`/(homeowner)/job/${j.id}` as never)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Card>
                <View style={styles.row}>
                  <Badge label={j.category.toUpperCase()} color={colors.homeowner} />
                  <Badge label={statusLabel(j)} color={j.published ? colors.accent : colors.textMuted} />
                </View>
                <Text style={[typography.h3, { color: colors.text }]}>{j.title}</Text>
                {j.location ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>{j.location}</Text>
                ) : null}
                <Text style={[typography.body, { color: colors.textMuted }]} numberOfLines={2}>
                  {j.description || '—'}
                </Text>
                <View style={styles.meta}>
                  <Text style={[typography.bodyStrong, { color: colors.text }]}>{formatBudget(j)}</Text>
                  <Text style={[typography.caption, { color: colors.textDim }]}>
                    {timeAgoIso(j.published_at || j.created_at)} ago
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card variant="alt" style={styles.stat}>
      <Text style={[typography.display, { color, fontSize: 26 }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
});
