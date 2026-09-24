import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roleNavigation } from '../lib/navigation';
import { colors, control, radius } from '../lib/tokens';

export function RoleTabs({ role }: { role: keyof typeof roleNavigation }) {
  const navigation = roleNavigation[role];
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const activeColor = colors[role];
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: activeColor,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: styles.item,
      tabBarStyle: [styles.bar, { height: 48 + Math.ceil(18 * fontScale) + insets.bottom }],
    }}>
      {navigation.tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarAccessibilityLabel: tab.title,
          tabBarLabel: ({ color }) => <Text style={[styles.label, { color }]}>{tab.label}</Text>,
          tabBarIcon: ({ focused, color }) => (
            <View style={[styles.icon, focused && { backgroundColor: `${activeColor}18` }]}>
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={24} color={color} />
            </View>
          ),
        }} />
      ))}
      {navigation.details.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingTop: 6 },
  item: { minHeight: control.minTouch, paddingHorizontal: 0 },
  icon: { width: 44, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 18, letterSpacing: 0, fontWeight: '600', textAlign: 'center' },
});
