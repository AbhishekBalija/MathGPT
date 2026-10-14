import type { AdminOverview } from "../../../services/admin.service";
import { formatAdminTime } from "../shared/formatAdminTime";
import { BarRow, Card } from "./cards";
import { CARD, MUTED } from "./styles";

const TOPIC_LABELS: Record<string, string> = {
  algebra: "Algebra",
  calculus_derivative: "Derivatives",
  calculus_integral: "Integrals",
  calculus_limit: "Limits",
  trigonometry: "Trigonometry",
  linear_algebra: "Linear algebra",
  geometry: "Geometry",
  statistics: "Statistics",
  unknown: "Other",
};

const share = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const percent = (part: number, whole: number) => `${Math.round(share(part, whole))}%`;

export function NumberRow({ numbers }: { numbers: AdminOverview["numbers"] }) {
  const items = [
    { label: "Solves", value: numbers.solves, note: `+${numbers.solvesToday} today`, tone: "text-emerald-700 dark:text-emerald-400" },
    { label: "Real students", value: numbers.realStudents, note: `+${numbers.teamStudents} team`, tone: MUTED },
    { label: "Active this week", value: numbers.activeThisWeek, note: "", tone: MUTED },
    {
      label: "Failed tries",
      value: numbers.failedTries,
      note: `${numbers.failedTries24h} in 24h`,
      tone: numbers.failedTries24h > 0 ? "text-red-600 dark:text-red-400" : MUTED,
    },
  ];
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 ${CARD}`}>
      {items.map((item) => (
        <div key={item.label} className="border-gray-200 p-4 dark:border-white/10 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${MUTED}`}>{item.label}</p>
          <p className="mt-1 text-2xl font-bold">
            {item.value}
            {item.note ? <span className={`ml-2 text-xs font-semibold ${item.tone}`}>{item.note}</span> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SolvesChart({ days }: { days: AdminOverview["solvesPerDay"] }) {
  const most = Math.max(1, ...days.map((day) => day.count));
  return (
    <Card title="Solves per day" note="Last 7 days, India time">
      <div className="flex h-40 items-end gap-2 px-4 pb-4" role="list">
        {days.map((day) => (
          <div key={day.day} role="listitem" className="flex flex-1 flex-col items-center gap-1 text-xs">
            <span className={MUTED}>{day.count > 0 ? day.count : ""}</span>
            <div
              className={`w-full rounded-t ${day.count > 0 ? "bg-brand-500/85 dark:bg-brand-500" : "bg-gray-200 dark:bg-white/10"}`}
              style={{ height: day.count > 0 ? `${(day.count / most) * 96}px` : "2px" }}
            />
            <span className={MUTED}>{Number(day.day.slice(8))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AiUsageCard({ usage }: { usage: AdminOverview["aiUsage"] }) {
  const total = usage.ai + usage.backup + usage.cache + usage.instant;
  const rows = [
    { label: "Main model", value: usage.ai, color: "bg-brand-500" },
    { label: "Backup model", value: usage.backup, color: "bg-violet-400" },
    { label: "From cache, free", value: usage.cache, color: "bg-emerald-500" },
    { label: "Instant, no AI", value: usage.instant, color: "bg-gray-400" },
  ];
  const aiCalls = usage.ai + usage.backup;
  return (
    <Card title="AI usage today" note={`Resets ${formatAdminTime(new Date(usage.resetsAt))} India time`}>
      <p className="px-4 text-3xl font-bold">
        {aiCalls}
        <span className={`ml-2 text-sm font-medium ${MUTED}`}>
          {usage.limit ? `of ${usage.limit} AI calls` : "AI calls (no daily limit set)"}
        </span>
      </p>
      {usage.limit ? (
        <div className="mx-4 mt-3 h-2.5 overflow-hidden rounded bg-gray-200 dark:bg-white/10">
          <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, share(aiCalls, usage.limit))}%` }} />
        </div>
      ) : null}
      <div className="px-4 pt-3 pb-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[12px_1fr_auto_48px] items-center gap-2 py-1">
            <span aria-hidden="true" className={`size-2 rounded-sm ${row.color}`} />
            <span>{row.label}</span>
            <span>{row.value}</span>
            <span className={`text-right ${MUTED}`}>{percent(row.value, total)}</span>
          </div>
        ))}
      </div>
      <div className={`flex justify-between border-t border-gray-200 px-4 py-2.5 text-xs dark:border-white/10 ${MUTED}`}>
        <span>{usage.tokensToday.toLocaleString("en-IN")} tokens today</span>
        <span>Avg {usage.avgTokensPerSolve.toLocaleString("en-IN")} per solve</span>
      </div>
    </Card>
  );
}

export function BusinessCard({ funnel, topics }: { funnel: AdminOverview["funnel"]; topics: AdminOverview["topTopics"] }) {
  const steps = [
    { label: "Signed up", value: funnel.signedUp, of: funnel.signedUp },
    { label: "Verified email", value: funnel.verified, of: funnel.signedUp },
    { label: "Solved a problem", value: funnel.solved, of: funnel.verified },
    { label: "Came back another day", value: funnel.cameBack, of: funnel.solved },
  ];
  const topicTotal = topics.reduce((sum, topic) => sum + topic.count, 0);
  return (
    <Card title="Business" note="Real students only">
      {funnel.signedUp === 0 ? (
        <p className={`px-4 pb-4 text-sm ${MUTED}`}>No real students yet.</p>
      ) : (
        steps.map((step, index) => (
          <BarRow
            key={step.label}
            label={step.label}
            value={index === 0 ? String(step.value) : `${step.value} · ${percent(step.value, step.of)}`}
            share={share(step.value, funnel.signedUp)}
          />
        ))
      )}
      {topics.length > 0 ? (
        <>
          <h3 className="mt-2 border-t border-gray-200 px-4 pt-3 pb-1 text-sm font-semibold dark:border-white/10">Top topics</h3>
          {topics.map((topic) => (
            <BarRow
              key={topic.problemType}
              label={TOPIC_LABELS[topic.problemType] ?? topic.problemType}
              value={String(topic.count)}
              share={share(topic.count, topicTotal)}
            />
          ))}
        </>
      ) : null}
      <div className="h-2" />
    </Card>
  );
}
