import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput, TextInputProps } from 'react-native-paper';
import { colors, control, radius, typography } from '../lib/tokens';

type Props = Omit<TextInputProps, 'label'> & {
  label?: string;
  helper?: string;
  error?: boolean;
};

export function Input({ label, helper, error = false, style, secureTextEntry, accessibilityLabel, ...rest }: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput
        mode="outlined"
        label={label}
        accessibilityLabel={accessibilityLabel ?? label}
        error={error}
        placeholderTextColor={colors.textDim}
        style={[styles.input, style]}
        outlineStyle={styles.outline}
        contentStyle={styles.content}
        secureTextEntry={Boolean(secureTextEntry && !passwordVisible)}
        right={secureTextEntry ? (
          <TextInput.Icon
            icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            style={styles.passwordToggle}
            forceTextInputFocus={false}
            onPress={() => setPasswordVisible((visible) => !visible)}
          />
        ) : undefined}
        {...rest}
      />
      {helper ? <HelperText type={error ? 'error' : 'info'} accessibilityLiveRegion="polite">{helper}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minWidth: 0 },
  passwordToggle: { width: control.minTouch, height: control.minTouch, margin: 0 },
  input: {
    minHeight: control.primaryHeight,
    backgroundColor: colors.surface,
  },
  outline: { borderRadius: radius.md },
  content: { ...typography.body, color: colors.text },
});
