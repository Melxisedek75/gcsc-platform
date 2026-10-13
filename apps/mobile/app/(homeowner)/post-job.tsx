import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { JOB_TEMPLATES, JobTemplate } from '../../lib/job-templates';
import { createBackendProject, parseBudgetRange, publishBackendProject } from '../../lib/jobs';
import { colors, radius, spacing, typography } from '../../lib/tokens';
import { useAppTheme } from '../../lib/theme';

const CATEGORIES = ['Renovation', 'Exterior', 'Repair', 'New build', 'Plumbing', 'Electrical'];

export default function PostJob() {
  useAppTheme();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Renovation');
  const [zip, setZip] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [preparing, setPreparing] = useState(false);

  async function handlePublish() {
    if (preparing) return;
    setPreparing(true);
    let savedProjectId: number | null = null;
    try {
      const budgetRange = parseBudgetRange(budget.trim());
      savedProjectId = await createBackendProject({
        title: title.trim(),
        description: description.trim() || title.trim(),
        category,
        location: zip.trim(),
        ...budgetRange,
      });
      await publishBackendProject(savedProjectId);
      router.replace('/(homeowner)/jobs');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not publish job';
      if (savedProjectId !== null) {
        Alert.alert('Draft saved', `${message}\n\nNo payment was made. You can publish this draft from My jobs.`, [
          { text: 'View draft', onPress: () => router.replace(`/(homeowner)/job/${savedProjectId}` as never) },
        ]);
      } else {
        Alert.alert('Could not save job', message);
      }
    } finally {
      setPreparing(false);
    }
  }

  const canPublish = title.trim().length > 0 && budget.trim().length > 0;

  function applyTemplate(t: JobTemplate) {
    setTitle(t.title);
    setCategory(t.category);
    setBudget(t.budget);
    const scope = t.scopeBullets.map((b) => `• ${b}`).join('\n');
    setDescription(`${t.description}\n\nScope:\n${scope}`);
  }

  return (
    <Screen>
      <Header title="Post a new job" subtitle="Share a project with contractors" />

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Quick start — tap a template to pre-fill
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}
        >
          {JOB_TEMPLATES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => applyTemplate(t)}
              style={({ pressed }) => [styles.tplCard, pressed && { opacity: 0.7 }]}
            >
              <Text style={[typography.micro, { color: colors.textDim }]}>{t.category}</Text>
              <Text
                style={[typography.bodyStrong, { color: colors.text }]}
                numberOfLines={2}
              >
                {t.title}
              </Text>
              <Text style={[typography.caption, { color: colors.brand }]}>{t.budget}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Input
        label="Job title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Bathroom remodel"
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  active && { backgroundColor: colors.brand, borderColor: colors.brand },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: active ? colors.bg : colors.textMuted, fontWeight: '600' },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="ZIP code"
        value={zip}
        onChangeText={setZip}
        placeholder="98103"
        keyboardType="number-pad"
      />
      <Input
        label="Budget range"
        value={budget}
        onChangeText={setBudget}
        placeholder="$5,000 – $10,000"
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Scope, materials, timeline expectations…"
        multiline
        numberOfLines={5}
        style={{ height: 120, textAlignVertical: 'top' }}
      />

      <Card variant="alt">
        <Text style={[typography.bodyStrong, { color: colors.text }]}>Publishing</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Publishing a job is free. No wallet connection or XPR transfer is required.
        </Text>
      </Card>

      <Button
        label={preparing ? 'Publishing…' : 'Publish job'}
        fullWidth
        onPress={handlePublish}
        disabled={!canPublish || preparing}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tplCard: {
    width: 200,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
});
