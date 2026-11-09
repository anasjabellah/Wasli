const labels: Record<string, string> = {
  PENDING: 'En attente',
  SCHEDULED: 'Planifiée',
  NOTIFIED: 'Arrivée signalée',
  PREPARING: 'En préparation',
  READY: 'Prêt',
  HANDED_OVER: 'Remis',
  CANCELLED: 'Annulée',
  REJECTED: 'Refusée',
  EXPIRED: 'Expirée',
};

export function statusLabel(status: string): string {
  return labels[status] ?? status;
}
