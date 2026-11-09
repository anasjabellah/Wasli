import type { ParentChild } from '@wasli/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { useCopy, useDirection } from '../../i18n';
import { ApiError, parentApi } from '../../lib/api';
import { colors } from '../../theme';
import { Body, Button, Card, Failure, LoadingBlock, Page, Title } from '../../ui';

export default function StudentScreen() {
  const copy = useCopy();
  const { text } = useDirection();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const studentId = params.id;
  const [child, setChild] = useState<ParentChild | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await parentApi.child(studentId);
      setChild(result.child);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function arrive(): Promise<void> {
    if (!child) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await parentApi.createPickup(child.id);
      setConfirmation(result.request.id);
      setChild({
        ...child,
        activePickup: {
          id: result.request.id,
          status: result.request.status,
          requestedAt: result.request.requestedAt,
          expiresAt: result.request.expiresAt,
        },
      });
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught.failure : null;
      if (failure?.code === 'DUPLICATE_PICKUP' && failure.requestId) {
        setConfirmation(failure.requestId);
      } else {
        setError(caught);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <Button label={copy.back} onPress={() => router.back()} tone="quiet" />
      {loading && !child ? <LoadingBlock /> : null}
      {error ? <Failure error={error} onRetry={() => void load()} /> : null}
      {child ? (
        <>
          <Title>{`${child.firstName} ${child.lastName}`}</Title>
          <Card>
            <Text style={[text, { color: colors.muted }]}>{copy.classLabel}</Text>
            <Body>{child.className ?? copy.noClass}</Body>
            <Text style={[text, { color: colors.muted }]}>{copy.centerLabel}</Text>
            <Body>{child.center.name}</Body>
            {child.center.addressLine ? <Body>{child.center.addressLine}</Body> : null}
            {child.center.city ? <Body>{child.center.city}</Body> : null}
            <Text style={[text, { color: colors.muted }]}>{copy.statusLabel}</Text>
            <Body>{child.activePickup ? copy.statuses[child.activePickup.status] : copy.noActiveRequests}</Body>
          </Card>
          {confirmation ? (
            <Card>
              <Body>{copy.confirmation}</Body>
              <Button label={copy.track} onPress={() => router.push(`/pickups/${confirmation}`)} />
            </Card>
          ) : null}
          {!confirmation && child.activePickup ? (
            <Button label={copy.track} onPress={() => router.push(`/pickups/${child.activePickup?.id}`)} />
          ) : null}
          {!confirmation && !child.activePickup ? (
            <Button
              label={submitting ? copy.submitting : copy.arrived}
              onPress={() => void arrive()}
              disabled={submitting}
            />
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
