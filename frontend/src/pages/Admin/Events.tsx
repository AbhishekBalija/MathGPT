import { useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import adminService, { type AnalyticsEvent } from "../../services/admin.service";
import { MUTED } from "./overview/styles";
import { formatAdminTime } from "./shared/formatAdminTime";
import { EmptyList, FilterChip, ListDetail, OutsideLinks } from "./shared/ListDetail";
import { useListAddress } from "./shared/useListAddress";
import { useAutoRefresh } from "./shared/useAutoRefresh";

const BASE = "/admin/events";
const ALL = "all";

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

// "calculus_integral · 14,900 ms"
function summary(event: AnalyticsEvent): string {
  const { properties } = event;
  const ms = typeof properties.processingTimeMs === "number" ? `${properties.processingTimeMs.toLocaleString("en-IN")} ms` : null;
  return [text(properties.problemType) ?? text(properties.errorCode), ms].filter(Boolean).join(" · ");
}

// "ai · gemini-2.5-flash"
function source(event: AnalyticsEvent): string {
  return [text(event.properties.source), text(event.properties.model)].filter(Boolean).join(" · ");
}

// The raw log of what happened, newest first.
export default function Events() {
  const address = useListAddress(BASE, ALL);
  const eventName = address.filter === ALL ? undefined : address.filter;
  const load = useCallback(() => adminService.getAnalytics(eventName), [eventName]);
  const { data, error, refresh } = useAutoRefresh(load);

  // A new filter loads straight away (the first load already runs)
  const shownFilter = useRef(eventName);
  useEffect(() => {
    if (shownFilter.current === eventName) return;
    shownFilter.current = eventName;
    refresh();
  }, [eventName, refresh]);

  const events = data?.recentEvents ?? [];
  const selected = events.find((event) => event.id === address.selectedId) ?? null;

  return (
    <ListDetail
      title="Events"
      summary="Raw log of what happened, newest first"
      error={error}
      filters={[
        <FilterChip key={ALL} to={address.filterPath(ALL)} on={!eventName} label="All" count={data?.totalEvents} />,
        ...(data?.eventsByType ?? []).map((entry) => (
          <FilterChip key={entry.eventName} to={address.filterPath(entry.eventName)} on={entry.eventName === eventName} label={entry.eventName} count={entry.count} />
        )),
      ]}
      detail={
        address.selectedId ? (
          selected ? (
            <div>
              <h2 className="text-base font-semibold">
                {selected.eventName} · {formatAdminTime(new Date(selected.createdAt))}
              </h2>
              <pre className="my-4 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs whitespace-pre-wrap break-words dark:border-white/10 dark:bg-[#0a0a0a]">
                {JSON.stringify(selected.properties, null, 2)}
              </pre>
              <div className="flex flex-wrap gap-2">
                <OutsideLinks id={selected.id} at={new Date(selected.createdAt)} />
              </div>
            </div>
          ) : (
            <p className={`text-sm ${MUTED}`}>{data ? "This event is not in the newest 50." : "Loading..."}</p>
          )
        ) : null
      }
      onClose={address.close}
    >
      {data && events.length === 0 ? <EmptyList>No events yet.</EmptyList> : null}
      {events.map((event) => {
        const isSelected = event.id === address.selectedId;
        return (
          <Link
            key={event.id}
            to={address.itemPath(event.id)}
            aria-current={isSelected ? "true" : undefined}
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t border-gray-200 px-4 py-2.5 text-sm first:border-t-0 hover:bg-gray-50 md:grid-cols-[96px_150px_minmax(0,1fr)_auto] dark:border-white/10 dark:hover:bg-white/5 ${
              isSelected ? "bg-gray-50 dark:bg-white/5" : ""
            }`}
          >
            <time dateTime={event.createdAt} className={MUTED}>
              {formatAdminTime(new Date(event.createdAt))}
            </time>
            <span className={`md:order-none ${event.eventName.includes("error") ? "text-red-600 dark:text-red-400" : ""}`}>{event.eventName}</span>
            <span className={`col-span-2 font-mono text-xs md:col-span-1 ${MUTED}`}>{summary(event)}</span>
            <span className={`font-mono text-xs ${MUTED}`}>{source(event)}</span>
          </Link>
        );
      })}
    </ListDetail>
  );
}
