import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useCopy, useDirection, useLocale } from '../i18n';
import { ApiError } from '../lib/api';
import { useSession } from '../session/session';
import { colors } from '../theme';
import { Body, Button, Card, Eyebrow, Failure, Field, Page, Title } from '../ui';

export default function LoginScreen() {
  const copy = useCopy();
  const { text, row } = useDirection();
  const { toggle } = useLocale();
  const router = useRouter();
  const { status, login } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (status === 'ready') {
    return <Redirect href="/home" />;
  }

  async function submit(): Promise<void> {
    const nextIdentifier = identifier.trim();
    if (!nextIdentifier || !password) {
      setFieldError(copy.required);
      setError(null);
      return;
    }
    if (password.length < 8) {
      setFieldError(copy.passwordTooShort);
      setError(null);
      return;
    }
    setFieldError(null);
    setError(null);
    setSubmitting(true);
    try {
      await login(nextIdentifier, password);
    } catch (caught) {
      setError(caught);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <View style={[row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Eyebrow>{copy.product}</Eyebrow>
        <Button label={copy.language} onPress={toggle} tone="quiet" />
      </View>
      <Button label={copy.product} onPress={() => router.push('/onboarding')} tone="quiet" />
      <Title>{copy.loginTitle}</Title>
      <Body>{copy.tagline}</Body>
      <Card>
        <Text style={[text, { color: colors.muted }]}>{copy.identifier}</Text>
        <Field
          accessibilityLabel={copy.identifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <Text style={[text, { color: colors.muted }]}>{copy.password}</Text>
        <Field
          accessibilityLabel={copy.password}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Button
          label={showPassword ? copy.hidePassword : copy.showPassword}
          onPress={() => setShowPassword((current) => !current)}
          tone="quiet"
        />
        {fieldError ? <Text style={{ color: colors.clay, fontSize: 16 }}>{fieldError}</Text> : null}
        <Button label={submitting ? copy.signingIn : copy.signIn} onPress={() => void submit()} disabled={submitting} />
      </Card>
      {error ? <Failure error={error instanceof ApiError ? error : error} onRetry={() => void submit()} /> : null}
    </Page>
  );
}
