'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon, type IconName } from './icons';

export function PageHeader({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="dk-page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children ? <div className="dk-page-actions">{children}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  href,
  icon,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  icon: IconName;
  accent?: 'lime' | 'blue' | 'navy';
}) {
  const body = (
    <>
      <span className={accent ? `dk-stat-icon ${accent}` : 'dk-stat-icon'}><Icon name={icon} size={18} /></span>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
  if (href) return <Link href={href} className="dk-stat">{body}</Link>;
  return <article className="dk-stat">{body}</article>;
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`dk-badge s-${status.toLowerCase()}`}>{label}</span>;
}

export function SearchBar({
  label,
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="dk-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Icon name="search" size={16} />
      <input aria-label={label} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </form>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="dk-filters">{children}</div>;
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="dk-sheet">
      <table className="dk-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={`${row.id}-${columns[index] ?? index}`} data-label={columns[index] ?? ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: IconName }) {
  return (
    <div className="dk-empty">
      {icon ? <Icon name={icon} size={22} /> : null}
      <p>{children}</p>
    </div>
  );
}

export function LoadingState({ children }: { children: ReactNode }) {
  return <p className="dk-loading">{children}</p>;
}

export function ErrorState({ message, retry, onRetry }: { message: string; retry: string; onRetry: () => void }) {
  return (
    <div className="dk-error-card">
      <p>{message}</p>
      <button className="dk-btn" type="button" onClick={onRetry}>{retry}</button>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dk-modal" role="presentation" onClick={onClose}>
      <div className="dk-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dk-dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="dk-dialog-title">{title}</h2>
        <p>{body}</p>
        <div className="dk-dialog-actions">
          <button className="dk-btn ghost" type="button" onClick={onClose}>{cancelLabel}</button>
          <button className="dk-btn" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function FormDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="dk-modal" role="presentation" onClick={onClose}>
      <div className="dk-dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
