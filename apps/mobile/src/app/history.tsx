import type { ParentPickup } from '@wasli/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useCopy, useDirection } from '../i18n';
import { parentApi } from '../lib/api';
import { TERMINAL } from '../pickup-status';
import { colors } from '../theme';
import { Body, Button, Card, Failure, LoadingBlock, Page, Title } from '../ui';

export default function HistoryScreen() {
  const copy = useCopy();
  const { text } = useDirection();
  const router = useRouter();
  const [requests, setRequests] = useState<ParentPickup[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await parentApi.pickups();
      setRequests(result.requests.filter((request) => TERMINAL.includes(request.status)));
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

  return (
    <Page>
      <Button label={copy.back} onPress={() => router.back()} tone="quiet" />
      <Title>{copy.history}</Title>
      {loading && !requests ? <LoadingBlock /> : null}
      {error ? <Failure error={error} onRetry={() => void load()} /> : null}
      {requests && requests.length === 0 ? (
        <Card>
          <Body>{copy.noHistory}</Body>
        </Card>
      ) : null}
      {requests?.map((request) => (
        <Pressable key={request.id} accessibilityRole="button" onPress={() => router.push(`/pickups/${request.id}`)}>
          <Card>
            <Text style={[text, { fontSize: 18, fontWeight: '700', color: colors.ink }]}>{request.studentName}</Text>
            <Body>{copy.statuses[request.status]}</Body>
            <Body>{new Date(request.requestedAt).toLocaleString()}</Body>
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}
