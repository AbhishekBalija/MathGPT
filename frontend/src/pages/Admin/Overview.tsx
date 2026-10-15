import { useState } from "react";
import { Link } from "react-router-dom";
import adminService, { type AdminOverview } from "../../services/admin.service";
import { AiUsageCard, BusinessCard, NumberRow, SolvesChart } from "./overview/OverviewCards";
import { ITEM_PAGES } from "./overview/itemPages";
import { NeedsYou } from "./overview/NeedsYou";
import { HealthCard } from "./overview/HealthCard";
import { healthLine } from "./health/healthLine";
import { neoLine } from "./overview/neoLine";
import { MUTED } from "./overview/styles";
import { DetailsPanel } from "./shared/DetailsPanel";
import { formatAdminTime } from "./shared/formatAdminTime";
import { NeoStatus } from "./shared/NeoStatus";
import { useAutoRefresh } from "./shared/useAutoRefresh";

type Item = AdminOverview["needsYou"][number];

const BUTTON = "min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5";

// The admin home: is anything wrong, what needs me, and how is it going.
export default function Overview() {
  const { data, error, updatedAt, refresh } = useAutoRefresh(adminService.getOverview);
  // Loaded on its own, so a slow or failed health check never holds up the rest
  const health = useAutoRefresh(adminService.getHealth);
  const [selected, setSelected] = useState<Item | null>(null);

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-400/30 dark:bg-red-400/10">
            <p>Couldn't load this. {error}</p>
            <button type="button" onClick={refresh} className={`${BUTTON} mt-3`}>
              Retry
            </button>
          </div>
        ) : (
          <p className={`mt-6 ${MUTED}`}>Loading...</p>
        )}
      </div>
    );
  }

  // A service that is down wins Neo's line; otherwise the Overview's own
  const fromHealth = health.data ? healthLine(health.data) : null;
  const neo = fromHealth?.state === "down" ? fromHealth : { state: data.status.state, ...neoLine(data) };
  // A refresh can drop the picked item (someone resolved it); then the panel closes
  const current = selected ? (data.needsYou.find((item) => item.kind === selected.kind && item.id === selected.id) ?? null) : null;
  const page = current ? ITEM_PAGES[current.kind] : null;

  return (
    <div className={current ? "lg:grid lg:grid-cols-[1fr_380px]" : ""}>
      {/* One column on phones, with "Needs you" right after Neo; two columns on laptops */}
      <div className="flex min-w-0 flex-col gap-4 p-4 md:p-8 lg:grid lg:grid-cols-2">
        <div className="order-0 flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <h1 className="text-2xl font-bold">Overview</h1>
          <div className={`flex items-center gap-3 text-sm ${MUTED}`}>
            {error ? <span className="text-red-600 dark:text-red-400">Couldn't refresh</span> : null}
            {updatedAt ? <span>Updated {formatAdminTime(updatedAt)}</span> : null}
            <button type="button" onClick={refresh} className={BUTTON}>
              Refresh
            </button>
          </div>
        </div>
        <div className="order-1 lg:col-span-2">
          <NeoStatus state={neo.state} title={neo.title} text={neo.text} />
        </div>
        <div className="order-2 lg:order-5">
          <NeedsYou items={data.needsYou} selectedId={current?.id ?? null} onSelect={setSelected} />
        </div>
        <div className="order-3 lg:col-span-2">
          <NumberRow numbers={data.numbers} />
        </div>
        <div className="order-4 lg:col-span-2">
          <SolvesChart days={data.solvesPerDay} />
        </div>
        <div className="order-5 lg:order-6">
          <HealthCard health={health.data} failed={health.error !== null} />
        </div>
        <div className="order-6">
          <AiUsageCard usage={data.aiUsage} />
        </div>
        <div className="order-7">
          <BusinessCard funnel={data.funnel} topics={data.topTopics} />
        </div>
      </div>

      {current && page ? (
        <DetailsPanel onClose={() => setSelected(null)}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${MUTED}`}>{page.name}</p>
          <h2 className="mt-1 text-lg font-semibold break-words whitespace-pre-wrap">{current.title}</h2>
          <dl className="mt-4 grid grid-cols-[96px_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className={MUTED}>What</dt>
            <dd>{current.subtitle}</dd>
            <dt className={MUTED}>When</dt>
            <dd>{formatAdminTime(new Date(current.at))}</dd>
          </dl>
          <Link
            to={`${page.path}/${current.id}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
          >
            Open in {page.name}
          </Link>
        </DetailsPanel>
      ) : null}
    </div>
  );
}
