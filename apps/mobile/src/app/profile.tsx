import { Redirect, useRouter } from 'expo-router';
import { useCopy } from '../i18n';
import { useSession } from '../session/session';
import { Body, Button, Card, Page, Title } from '../ui';

export default function ProfileScreen() {
  const copy = useCopy();
  const router = useRouter();
  const { status, user } = useSession();
  if (status === 'anonymous') return <Redirect href="/login" />;
  return (
    <Page>
      <Button label={copy.back} onPress={() => router.back()} tone="quiet" />
      <Title>{user ? `${user.firstName} ${user.lastName}` : copy.parentAccount}</Title>
      <Card>
        <Body>{user?.email ?? ''}</Body>
        {user?.phone ? <Body>{user.phone}</Body> : null}
        <Body>{copy.parentAccount}</Body>
      </Card>
      <Button label={copy.language} onPress={() => router.push('/settings')} tone="quiet" />
    </Page>
  );
}
