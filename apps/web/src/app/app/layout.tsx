'use client';

import { AppFrame } from '@/components/app/frame';
import type { ReactNode } from 'react';

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
