import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../lib/tokens';
import { useAppTheme } from '../lib/theme';

type Props = { role: 'homeowner' | 'contractor' };

export function WorkspaceBanner({ role }: Props) {
  useAppTheme();
  return (
    <View style={[styles.frame, { borderColor: colors.border }]}>
      <ImageBackground
        source={require('../assets/prototype/dusk.png')}
        style={styles.photo}
        imageStyle={styles.image}
        accessibilityLabel="Illustrative renovated home"
      >
        <View style={styles.copy}>
          <Text style={styles.brand}>SMART CONTRACTOR</Text>
          <Text style={[typography.h1, styles.title]}>
            {role === 'homeowner' ? 'Your projects' : 'Available work'}
          </Text>
          <Text style={styles.caption}>Illustrative image</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  photo: { height: 176, justifyContent: 'flex-end' },
  image: { resizeMode: 'cover' },
  copy: { padding: spacing.lg, backgroundColor: '#09111DD9', gap: spacing.xs },
  brand: { color: '#83A6FF', fontSize: 11, fontWeight: '700', letterSpacing: 0 },
  title: { color: '#FFFFFF' },
  caption: { color: '#C8D3E2', fontSize: 11 },
});
