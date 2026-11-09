import { Redirect, useRouter } from 'expo-router';
import { useCopy, useLocale } from '../i18n';
import { useSession } from '../session/session';
import { Body, Button, Card, Page, Title } from '../ui';

export default function SettingsScreen() {
  const copy = useCopy();
  const { toggle } = useLocale();
  const router = useRouter();
  const { status, logout } = useSession();
  if (status === 'anonymous') return <Redirect href="/login" />;
  return (
    <Page>
      <Button label={copy.back} onPress={() => router.back()} tone="quiet" />
      <Title>{copy.language}</Title>
      <Card>
        <Body>{copy.tagline}</Body>
        <Button label={copy.language} onPress={toggle} tone="quiet" />
      </Card>
      <Button label={copy.logout} onPress={() => void logout()} />
    </Page>
  );
}
