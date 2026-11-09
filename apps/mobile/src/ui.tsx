import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useCopy, useDirection } from './i18n';
import { colors } from './theme';
import type { ApiError } from './lib/api';

export function Screen({ children }: { children: ReactNode }) {
  const { screen } = useDirection();
  return <View style={[styles.screen, screen]}>{children}</View>;
}

export function Page({ children }: { children: ReactNode }) {
  const { screen } = useDirection();
  return (
    <ScrollView contentContainerStyle={[styles.page, screen]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children }: { children: string }) {
  const { text } = useDirection();
  return <Text style={[styles.eyebrow, text]}>{children}</Text>;
}

export function Title({ children }: { children: string }) {
  const { text } = useDirection();
  return <Text style={[styles.title, text]}>{children}</Text>;
}

export function Body({ children }: { children: string }) {
  const { text } = useDirection();
  return <Text style={[styles.body, text]}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Field(props: TextInputProps) {
  const { text } = useDirection();
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, text]} {...props} />;
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'quiet' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'quiet' && styles.quiet,
        tone === 'danger' && styles.danger,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'quiet' && styles.quietLabel]}>{label}</Text>
    </Pressable>
  );
}

export function LoadingBlock() {
  const copy = useCopy();
  const { text } = useDirection();
  return (
    <View style={styles.statusRow}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[styles.body, text]}>{copy.loading}</Text>
    </View>
  );
}

export function Failure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const copy = useCopy();
  const { text } = useDirection();
  const code = (error as ApiError | undefined)?.failure?.code;
  const message = code && code in copy.errors ? copy.errors[code as keyof typeof copy.errors] : copy.errors.UNKNOWN;
  return (
    <Card>
      <Text style={[styles.error, text]}>{message}</Text>
      <Button label={copy.retry} onPress={onRetry} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40, gap: 16 },
  eyebrow: { color: colors.accent, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '650', letterSpacing: -0.6, color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  quiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.clay },
  pressed: { opacity: 0.7 },
  buttonLabel: { color: colors.card, fontSize: 16, fontWeight: '700' },
  quietLabel: { color: colors.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  error: { color: colors.clay, fontSize: 16, lineHeight: 24 },
});
