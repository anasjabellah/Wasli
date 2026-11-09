import type { ParentPickup } from '@wasli/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useCopy, useDirection } from '../../i18n';
import { parentApi } from '../../lib/api';
import { ACTIVE, STAGES, TERMINAL } from '../../pickup-status';
import { colors } from '../../theme';
import { Body, Button, Card, Failure, LoadingBlock, Page, Title } from '../../ui';

export default function PickupScreen() {
  const copy = useCopy();
  const { text } = useDirection();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = params.id;
  const [request, setRequest] = useState<ParentPickup | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) {
      return;
    }
    setError(null);
    try {
      const result = await parentApi.pickup(requestId);
      setRequest(result.request);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!request || !ACTIVE.includes(request.status)) {
      return undefined;
    }
    const timer = setInterval(() => {
      void load();
    }, 5_000);
    return () => clearInterval(timer);
  }, [load, request?.status]);

  async function cancel(): Promise<void> {
    if (!request) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const result = await parentApi.cancelPickup(request.id);
      setRequest(result.request);
      setConfirmCancel(false);
    } catch (caught) {
      setError(caught);
    } finally {
      setCancelling(false);
    }
  }

  const stageIndex = request ? STAGES.indexOf(request.status as (typeof STAGES)[number]) : -1;

  return (
    <Page>
      <Button label={copy.back} onPress={() => router.back()} tone="quiet" />
      {loading && !request ? <LoadingBlock /> : null}
      {error ? <Failure error={error} onRetry={() => void load()} /> : null}
      {request ? (
        <>
          <Title>{request.studentName}</Title>
          <Body>{request.className ?? copy.noClass}</Body>
          <Body>{request.centerName}</Body>
          {TERMINAL.includes(request.status) && !STAGES.includes(request.status as (typeof STAGES)[number]) ? (
            <Card>
              <Body>{copy.statuses[request.status]}</Body>
              {request.cancelledReason ? <Body>{request.cancelledReason}</Body> : null}
              {request.rejectedReason ? <Body>{request.rejectedReason}</Body> : null}
            </Card>
          ) : (
            <Card>
              {STAGES.map((stage, index) => {
                const reached = stageIndex >= index;
                return (
                  <View key={stage} style={{ minHeight: 48, justifyContent: 'center' }}>
                    <Text style={[text, { color: reached ? colors.accent : colors.muted, fontSize: 16, fontWeight: reached ? '700' : '400' }]}>
                      {copy.statuses[stage]}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}
          <Card>
            <Text style={[text, { fontSize: 18, fontWeight: '700', color: colors.ink }]}>{copy.pinTitle}</Text>
            {request.pin ? (
              <>
                <Text accessibilityLabel={copy.pinTitle} style={{ fontSize: 36, letterSpacing: 8, fontWeight: '700', color: colors.ink }}>
                  {request.pin}
                </Text>
                <Body>{copy.pinHint}</Body>
              </>
            ) : (
              <Body>{copy.pinHidden}</Body>
            )}
          </Card>
          {request.canCancel ? (
            <Button
              label={cancelling ? copy.cancelling : confirmCancel ? copy.confirmCancel : copy.cancel}
              onPress={() => {
                if (!confirmCancel) {
                  setConfirmCancel(true);
                  return;
                }
                void cancel();
              }}
              disabled={cancelling}
              tone="danger"
            />
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
