import { Redirect } from 'expo-router';
import { Body, Page, Title } from '../ui';
import { useCopy } from '../i18n';
import { useSession } from '../session/session';

export default function IndexScreen() {
  const copy = useCopy();
  const { status } = useSession();
  if (status === 'ready') {
    return <Redirect href="/home" />;
  }
  if (status === 'anonymous') {
    return <Redirect href="/login" />;
  }
  return (
    <Page>
      <Title>{copy.product}</Title>
      <Body>{copy.sessionChecking}</Body>
    </Page>
  );
}
