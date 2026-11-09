import { useRouter } from 'expo-router';
import { useCopy } from '../i18n';
import { Body, Button, Card, Page, Title } from '../ui';

export default function OnboardingScreen() {
  const copy = useCopy();
  const router = useRouter();
  const steps = [copy.tagline, copy.arrived, copy.pinHint];
  return (
    <Page>
      <Title>{copy.product}</Title>
      {steps.map((step) => (
        <Card key={step}>
          <Body>{step}</Body>
        </Card>
      ))}
      <Button label={copy.signIn} onPress={() => router.replace('/login')} />
    </Page>
  );
}
