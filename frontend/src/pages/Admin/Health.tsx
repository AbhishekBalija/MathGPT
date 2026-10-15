import { useState } from "react";
import adminService, { type AdminHealth, type HealthServiceId } from "../../services/admin.service";
import { buildHealthReport } from "./health/buildHealthReport";
import { SERVICES } from "./health/runbooks";
import { BarRow, Card } from "./overview/cards";
import { MUTED } from "./overview/styles";
import { formatAdminTime } from "./shared/formatAdminTime";
import { healthLine } from "./health/healthLine";
import { NeoStatus } from "./shared/NeoStatus";
import { useAutoRefresh } from "./shared/useAutoRefresh";

const BUTTON = "min-h-11 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5";
const FRONTEND_COMMIT = (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined)?.slice(0, 7) ?? "local";

type Service = AdminHealth["services"][number];

const STATUS_LOOK: Record<Service["status"], { dot: string; label: string }> = {
  up: { dot: "bg-emerald-600 dark:bg-emerald-400", label: "Up" },
  key_set: { dot: "bg-emerald-600 dark:bg-emerald-400", label: "Key set" },
  down: { dot: "bg-red-600 dark:bg-red-400", label: "Down" },
  key_missing: { dot: "bg-amber-600 dark:bg-amber-400", label: "Key missing" },
};

function ServiceRow({ service, open, onToggle }: { service: Service; open: boolean; onToggle: () => void }) {
  const info = SERVICES[service.id];
  const look = STATUS_LOOK[service.status];
  return (
    <li className="border-t border-gray-200 dark:border-white/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid min-h-11 w-full grid-cols-[18px_1fr_auto] items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
      >
        <span aria-hidden="true" className={`size-2.5 rounded-full ${look.dot}`} />
        <span>
          {info.name} <span className={`text-xs ${MUTED}`}>{info.what}</span>
        </span>
        <span className={`text-xs ${MUTED}`}>{service.ms !== null && service.status === "up" ? `${service.ms} ms` : look.label}</span>
      </button>
      {open ? (
        <div className={`px-4 pb-3 pl-10 text-sm ${MUTED}`}>
          {service.detail ? <p className="mb-1 font-mono text-xs text-red-700 dark:text-red-400">{service.detail}</p> : null}
          <p>
            <b className="text-gray-900 dark:text-gray-50">If this is down:</b> {info.runbook}
          </p>
        </div>
      ) : null}
    </li>
  );
}

// Is everything running, and what is deployed.
export default function Health() {
  const { data, error, refresh } = useAutoRefresh(adminService.getHealth);
  const [open, setOpen] = useState<HealthServiceId | null>(null);
  const [copied, setCopied] = useState(false);
  // Set when the browser won't let us copy, so the report shows to copy by hand
  const [manualReport, setManualReport] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold">Health</h1>
        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-400/30 dark:bg-red-400/10">
            <p>Couldn't load this. {error}</p>
            <button type="button" onClick={refresh} className={`${BUTTON} mt-3`}>
              Retry
            </button>
          </div>
        ) : (
          <p className={`mt-6 ${MUTED}`}>Checking...</p>
        )}
      </div>
    );
  }

  const line = healthLine(data);
  const { solving, live } = data;
  const worstDay = Math.max(1, ...solving.days.map((day) => day.tries));
  const codeTotal = solving.byCode.reduce((sum, code) => sum + code.count, 0);

  const copyReport = async () => {
    const report = buildHealthReport(data, FRONTEND_COMMIT);
    try {
      // The clipboard is missing on non-https pages and can be blocked
      if (!navigator.clipboard) throw new Error("No clipboard");
      await navigator.clipboard.writeText(report);
      setManualReport(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setManualReport(report);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Health</h1>
        <div className={`flex flex-wrap items-center gap-2 text-sm ${MUTED}`}>
          <span>Checked {formatAdminTime(new Date(data.checkedAt))}</span>
          <button type="button" onClick={refresh} className={BUTTON}>
            Check now
          </button>
          <button
            type="button"
            onClick={copyReport}
            className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
          >
            {copied ? "Copied" : "Copy health report for Claude"}
          </button>
        </div>
      </div>

      {manualReport ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className={MUTED}>Couldn't copy. Select this and copy it yourself.</span>
          <textarea
            readOnly
            aria-label="Health report for Claude"
            value={manualReport}
            onFocus={(event) => event.currentTarget.select()}
            rows={8}
            className="rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs dark:border-white/10 dark:bg-white/5"
          />
        </label>
      ) : null}

      <NeoStatus state={line.state} title={line.title} text={line.text} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Services" note="Open a row for what to do">
          <ul className="pb-1">
            {data.services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                open={open === service.id}
                onToggle={() => setOpen((current) => (current === service.id ? null : service.id))}
              />
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Solving">
            <p className="px-4 font-semibold">
              {solving.failed24h} of {solving.tries24h} tries failed in the last 24 hours
            </p>
            <div className="flex items-end gap-1.5 px-4 pt-3" role="list" aria-label="Last 7 days">
              {solving.days.map((day) => (
                <div
                  key={day.day}
                  role="listitem"
                  title={`${day.day}: ${day.failed} of ${day.tries} failed`}
                  className={`h-6 flex-1 rounded-sm ${
                    day.tries === 0
                      ? "bg-gray-200 dark:bg-white/10"
                      : day.failed === 0
                        ? "bg-emerald-600 dark:bg-emerald-400"
                        : day.failed / day.tries > 0.5
                          ? "bg-red-600 dark:bg-red-400"
                          : "bg-amber-600 dark:bg-amber-400"
                  }`}
                  style={{ opacity: day.tries === 0 ? 1 : 0.5 + (0.5 * day.tries) / worstDay }}
                />
              ))}
            </div>
            <p className={`px-4 pt-1.5 pb-2 text-xs ${MUTED}`}>Last 7 days: green no failures, amber some, red most, grey no solves</p>
            {solving.byCode.length > 0 ? <h3 className="px-4 pt-1 pb-1 text-xs font-semibold">Failures this week, by error</h3> : null}
            {solving.byCode.map((code) => (
              <BarRow key={code.errorCode} label={code.errorCode} value={String(code.count)} share={(code.count / codeTotal) * 100} />
            ))}
            <div className="h-2" />
          </Card>
          <Card title="Speed" note="All solves">
            <dl className="grid grid-cols-[1fr_auto] gap-y-1 px-4 pb-4 text-sm">
              <dt>Average</dt>
              <dd>{(data.speed.avgMs / 1000).toFixed(1)} s</dd>
              <dt>Slowest 10% take over</dt>
              <dd>{(data.speed.p90Ms / 1000).toFixed(1)} s</dd>
            </dl>
          </Card>
        </div>
      </div>

      <Card title="What's live" note={live.migrations.pending.length === 0 ? "All match" : "Something is missing"}>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 px-4 pb-3 text-sm">
          <dt>Frontend</dt>
          <dd className="font-mono text-xs">{FRONTEND_COMMIT}</dd>
          <dt>Backend</dt>
          <dd className="font-mono text-xs">{live.backendCommit}</dd>
          <dt>Database migrations</dt>
          <dd className="font-mono text-xs">
            {live.migrations.applied} applied · {live.migrations.latest}
            {live.migrations.pending.length > 0 ? <span className="text-red-600 dark:text-red-400"> · missing {live.migrations.pending.join(", ")}</span> : null}
          </dd>
          <dt>Settings the API needs (names only)</dt>
          <dd className="text-xs">
            {live.env.filter((entry) => entry.set).length} of {live.env.length} set
          </dd>
        </dl>
        <ul className="flex flex-wrap gap-1.5 px-4 pb-4" aria-label="Settings the API needs">
          {live.env.map((entry) => (
            <li
              key={entry.name}
              className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] ${
                entry.set ? "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-[#8b93a1]" : "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-400"
              }`}
            >
              {entry.set ? "✓" : "✗"} {entry.name}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
