import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CARD, MUTED } from "../overview/styles";
import { DetailsPanel } from "./DetailsPanel";
import { formatAdminTime } from "./formatAdminTime";
import { ACTION } from "./listStyles";

export function Tag({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold ${className}`}>{children}</span>;
}

interface ListDetailProps {
  title: string;
  summary: ReactNode;
  filters?: ReactNode;
  error?: string | null;
  // Shown only when an item is picked
  detail: ReactNode | null;
  onClose: () => void;
  children: ReactNode;
  // Below everything, e.g. the Undo bar
  footer?: ReactNode;
}

// The list on the left and one item's details on the right (below on phones).
export function ListDetail({ title, summary, filters, error, detail, onClose, children, footer }: ListDetailProps) {
  return (
    <div className={detail ? "lg:grid lg:grid-cols-[minmax(0,1fr)_380px]" : ""}>
      <div className="min-w-0 p-4 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className={`text-sm ${MUTED}`}>{summary}</p>
        </div>
        {filters ? <div className="mt-4 flex flex-wrap items-center gap-1.5">{filters}</div> : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-400/30 dark:bg-red-400/10">Couldn't load this. {error}</p>
        ) : null}
        <div className={`mt-3 overflow-hidden ${CARD}`}>{children}</div>
      </div>
      {detail ? <DetailsPanel onClose={onClose}>{detail}</DetailsPanel> : null}
      {footer}
    </div>
  );
}

// One filter, as a link so the view has its own address
export function FilterChip({ to, on, label, count }: { to: string; on: boolean; label: string; count?: number }) {
  return (
    <Link
      to={to}
      aria-current={on ? "true" : undefined}
      className={`inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm md:min-h-9 ${
        on ? "border-gray-900 font-semibold dark:border-gray-50" : `border-gray-200 dark:border-white/10 ${MUTED}`
      }`}
    >
      {label}
      {count !== undefined ? <b className="text-gray-900 dark:text-gray-50">{count}</b> : null}
    </Link>
  );
}

interface ItemRowProps {
  to: string;
  selected: boolean;
  tag: ReactNode;
  title: ReactNode;
  sub: ReactNode;
  at: string;
}

// One row in a list. The title is clamped to 2 lines; the details show all of it.
export function ItemRow({ to, selected, tag, title, sub, at }: ItemRowProps) {
  return (
    <Link
      to={to}
      aria-current={selected ? "true" : undefined}
      className={`grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t border-gray-200 px-4 py-3 first:border-t-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5 md:grid-cols-[88px_minmax(0,1fr)_auto] ${
        selected ? "bg-gray-50 shadow-[inset_2px_0_0_var(--color-brand-600)] dark:bg-white/5 dark:shadow-[inset_2px_0_0_var(--color-brand-300)]" : ""
      }`}
    >
      <span>{tag}</span>
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm break-words">{title}</span>
        <span className={`mt-1 block text-xs ${MUTED}`}>{sub}</span>
      </span>
      <time dateTime={at} className="col-start-2 text-xs whitespace-nowrap text-gray-500 md:col-start-auto dark:text-[#8b93a1]">
        {formatAdminTime(new Date(at))}
      </time>
    </Link>
  );
}

export function EmptyList({ children }: { children: ReactNode }) {
  return <p className={`px-4 py-10 text-center text-sm ${MUTED}`}>{children}</p>;
}

// Label and value pairs in the details panel
export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="my-4 grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className={MUTED}>{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ items }: { items: Array<{ key: string; content: ReactNode }> }) {
  return (
    <ol className="my-4 ml-1.5 border-l border-gray-200 pl-4 text-sm dark:border-white/10">
      {items.map((item) => (
        <li key={item.key} className={`relative py-1 ${MUTED} before:absolute before:top-2.5 before:-left-[19.5px] before:size-1.5 before:rounded-full before:bg-gray-400`}>
          {item.content}
        </li>
      ))}
    </ol>
  );
}

// "Marked resolved · Undo". The change is only saved after 5 seconds.
export function UndoBar({ message, failed, onUndo }: { message: string; failed: boolean; onUndo: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex min-h-11 -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-900 pr-1 pl-4 text-sm text-white dark:bg-gray-50 dark:text-gray-900"
    >
      {failed ? (
        <span className="pr-3">Couldn't save that. Try again.</span>
      ) : (
        <>
          <span>{message} ·</span>
          <button type="button" onClick={onUndo} className="min-h-11 px-3 font-semibold underline underline-offset-4">
            Undo
          </button>
        </>
      )}
    </div>
  );
}

// Sentry and Vercel logs for the 5 minutes around one moment
export function OutsideLinks({ id, at }: { id: string; at: Date }) {
  const time = at.getTime();
  const links = [
    { label: "Sentry", href: `https://sentry.io/issues/?query=${id}` },
    { label: "Vercel logs", href: `https://vercel.com/abhishek-an-83378fc9/neomath-api/logs?startDate=${time - 150_000}&endDate=${time + 150_000}` },
  ];
  return (
    <>
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className={`${ACTION} inline-flex items-center`}>
          {link.label} ↗
        </a>
      ))}
    </>
  );
}
