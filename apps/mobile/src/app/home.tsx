import type { ParentChild, ParentPickup } from '@wasli/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCopy, useDirection, useLocale } from '../i18n';
import { parentApi } from '../lib/api';
import { useSession } from '../session/session';
import { colors } from '../theme';
import { ACTIVE } from '../pickup-status';
import { Body, Button, Card, Eyebrow, Failure, LoadingBlock, Page, Title } from '../ui';

export default function HomeScreen() {
  const copy = useCopy();
  const { text } = useDirection();
  const { toggle } = useLocale();
  const router = useRouter();
  const { user, logout } = useSession();
  const [children, setChildren] = useState<ParentChild[] | null>(null);
  const [requests, setRequests] = useState<ParentPickup[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [childResult, pickupResult] = await Promise.all([parentApi.children(), parentApi.pickups()]);
      setChildren(childResult.children);
      setRequests(pickupResult.requests.filter((request) => ACTIVE.includes(request.status)));
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const active = requests ?? [];

  return (
    <Page>
      <ViewRow>
        <Eyebrow>{copy.product}</Eyebrow>
        <Button label={copy.language} onPress={toggle} tone="quiet" />
      </ViewRow>
      <Title>{user ? `${copy.welcome} ${user.firstName}` : copy.welcome}</Title>
      <Card>
        <Text style={[text, { color: colors.muted }]}>{copy.parentAccount}</Text>
        <Body>{user ? `${user.firstName} ${user.lastName}` : ''}</Body>
        <Body>{user?.email ?? ''}</Body>
        {user?.phone ? <Body>{user.phone}</Body> : null}
      </Card>
      <ViewRow>
        <Button label={copy.notifications} onPress={() => router.push('/notifications')} tone="quiet" />
        <Button label={copy.history} onPress={() => router.push('/history')} tone="quiet" />
        <Button label={copy.parentAccount} onPress={() => router.push('/profile')} tone="quiet" />
      </ViewRow>
      {loading && !children ? <LoadingBlock /> : null}
      {error ? <Failure error={error} onRetry={() => void load()} /> : null}
      <Text style={[text, { fontSize: 22, fontWeight: '700', color: colors.ink }]}>{copy.children}</Text>
      {children && children.length === 0 ? (
        <Card>
          <Body>{copy.noChildren}</Body>
        </Card>
      ) : null}
      {children?.map((child) => (
        <Pressable key={child.id} accessibilityRole="button" onPress={() => router.push(`/students/${child.id}`)}>
          <Card>
            <Text style={[text, { fontSize: 20, fontWeight: '700', color: colors.ink }]}>
              {child.firstName} {child.lastName}
            </Text>
            <Body>{child.className ?? copy.noClass}</Body>
            <Body>{child.center.name}</Body>
            {child.activePickup ? <Body>{copy.statuses[child.activePickup.status]}</Body> : null}
          </Card>
        </Pressable>
      ))}
      <Text style={[text, { fontSize: 22, fontWeight: '700', color: colors.ink }]}>{copy.activeRequests}</Text>
      {requests && active.length === 0 ? (
        <Card>
          <Body>{copy.noActiveRequests}</Body>
        </Card>
      ) : null}
      {active.map((request) => (
        <Pressable key={request.id} accessibilityRole="button" onPress={() => router.push(`/pickups/${request.id}`)}>
          <Card>
            <Body>{request.studentName}</Body>
            <Body>{copy.statuses[request.status]}</Body>
          </Card>
        </Pressable>
      ))}
      <Button label={copy.logout} onPress={() => void logout()} tone="quiet" />
    </Page>
  );
}

function ViewRow({ children }: { children: ReactNode }) {
  const { row } = useDirection();
  return <View style={[row, { gap: 12, flexWrap: 'wrap' }]}>{children}</View>;
}
