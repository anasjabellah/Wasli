import type { ParentNotification } from '@wasli/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useCopy, useDirection } from '../i18n';
import { parentApi } from '../lib/api';
import { colors } from '../theme';
import { Body, Button, Card, Failure, LoadingBlock, Page, Title } from '../ui';

export default function NotificationsScreen() {
  const copy = useCopy();
  const { text } = useDirection();
  const router = useRouter();
  const [notes, setNotes] = useState<ParentNotification[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await parentApi.notifications();
      setNotes(result.notifications);
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
      <Title>{copy.notifications}</Title>
      {loading && !notes ? <LoadingBlock /> : null}
      {error ? <Failure error={error} onRetry={() => void load()} /> : null}
      {notes && notes.length === 0 ? (
        <Card>
          <Body>{copy.noNotifications}</Body>
        </Card>
      ) : null}
      {notes?.map((note) => (
        <Pressable
          key={note.id}
          accessibilityRole="button"
          disabled={!note.pickupRequestId}
          onPress={() => {
            if (note.pickupRequestId) {
              router.push(`/pickups/${note.pickupRequestId}`);
            }
          }}
        >
          <Card>
            <Text style={[text, { fontSize: 18, fontWeight: '700', color: colors.ink }]}>{note.title}</Text>
            <Body>{note.body}</Body>
          </Card>
        </Pressable>
      ))}
    </Page>
  );
}
