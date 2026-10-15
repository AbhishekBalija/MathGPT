import { useCallback, useEffect, useRef, useState } from "react";
import adminService, { type AdminBusiness } from "../../services/admin.service";
import { Card } from "./overview/cards";
import { DayChart, FunnelRows, TopicRows } from "./overview/OverviewCards";
import { CARD, MUTED } from "./overview/styles";
import { NeoStatus } from "./shared/NeoStatus";
import { useAutoRefresh } from "./shared/useAutoRefresh";

const DAY_MS = 24 * 60 * 60 * 1000;
const monthFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });

// "12 to 18 Oct", or "28 Sep to 4 Oct" across two months
function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const startMonth = monthFormat.format(start);
  const endMonth = monthFormat.format(end);
  return startMonth === endMonth
    ? `${start.getUTCDate()} to ${end.getUTCDate()} ${endMonth}`
    : `${start.getUTCDate()} ${startMonth} to ${end.getUTCDate()} ${endMonth}`;
}

// Neo's one-line summary of the business
function businessLine(data: AdminBusiness, includeTeam: boolean): { title: string; text: string } {
  const { students, activeThisWeek } = data.numbers;
  if (students === 0) {
    return { title: "No real students yet.", text: "Only team accounts so far, so there is nothing to read yet." };
  }
  const noun = includeTeam ? (students === 1 ? "account" : "accounts") : students === 1 ? "real student" : "real students";
  return {
    title: `${students} ${noun} so far${includeTeam ? ", team included" : ""}.`,
    text: `${data.funnel.cameBack} came back another day, and ${activeThisWeek} solved something this week.`,
  };
}

function NumberCards({ numbers }: { numbers: AdminBusiness["numbers"] }) {
  const items = [
    { label: "Real students", value: String(numbers.students), note: "" },
    { label: "Active this week", value: String(numbers.activeThisWeek), note: `${numbers.activeRate}%` },
    { label: "Solves per active student", value: String(numbers.solvesPerActive), note: "this week" },
    { label: "Hit the daily limit", value: String(numbers.limitHits), note: numbers.limitHits === 1 ? "time" : "times" },
  ];
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 ${CARD}`}>
      {items.map((item) => (
        <div key={item.label} className="border-gray-200 p-4 dark:border-white/10 [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${MUTED}`}>{item.label}</p>
          <p className="mt-1 text-2xl font-bold">
            {item.value}
            {item.note ? <span className={`ml-2 text-xs font-semibold ${MUTED}`}>{item.note}</span> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

function CohortTable({ cohorts }: { cohorts: AdminBusiness["cohorts"] }) {
  const columns = Math.max(1, ...cohorts.map((cohort) => cohort.weeks.length));
  if (cohorts.every((cohort) => cohort.students === 0)) {
    return <p className={`px-4 pb-4 text-sm ${MUTED}`}>No real students yet.</p>;
  }
  return (
    <div className="overflow-x-auto px-4 pb-3">
      <table className="w-full text-sm">
        <thead>
          <tr className={`text-left text-[11px] font-semibold tracking-wider uppercase ${MUTED}`}>
            <th className="py-2 pr-3">Signed up</th>
            <th className="py-2 pr-3">Students</th>
            {Array.from({ length: columns }, (_, week) => (
              <th key={week} className="py-2 pr-3 whitespace-nowrap">
                Week {week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.weekStart} className="border-t border-gray-200 dark:border-white/10">
              <td className="py-2 pr-3 whitespace-nowrap">{weekLabel(cohort.weekStart)}</td>
              <td className="py-2 pr-3">{cohort.students}</td>
              {Array.from({ length: columns }, (_, week) => {
                const value = cohort.weeks[week];
                // The last week of every cohort is this week
                const thisWeek = week === cohort.weeks.length - 1;
                return (
                  <td key={week} className={`py-2 pr-3 ${value === undefined ? MUTED : ""}`}>
                    {value === undefined ? "–" : `${value}%${thisWeek ? "*" : ""}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`pt-2 text-xs ${MUTED}`}>* this week is not over yet. Week 0 is always 100%.</p>
    </div>
  );
}

// Real students, who comes back, what they ask and what it costs.
export default function Business() {
  const [includeTeam, setIncludeTeam] = useState(false);
  const load = useCallback(async () => ({ includeTeam, ...(await adminService.getBusiness(includeTeam)) }), [includeTeam]);
  const { data: loaded, error, refresh } = useAutoRefresh(load);
  // Never show one setting's numbers under the other
  const data = loaded?.includeTeam === includeTeam ? loaded : null;

  // Switching the checkbox loads straight away (the first load already runs)
  const shown = useRef(includeTeam);
  useEffect(() => {
    if (shown.current === includeTeam) return;
    shown.current = includeTeam;
    refresh();
  }, [includeTeam, refresh]);

  const line = data ? businessLine(data, includeTeam) : null;
  const hidden = loaded?.hiddenTeam ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Business</h1>
        <label className={`flex min-h-11 items-center gap-2 text-sm ${MUTED}`}>
          <input type="checkbox" checked={includeTeam} onChange={(event) => setIncludeTeam(event.target.checked)} className="size-4" />
          Include team accounts ({hidden} hidden)
        </label>
      </div>
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-400/30 dark:bg-red-400/10">Couldn't load this. {error}</p> : null}
      {!data || !line ? (
        error ? null : <p className={MUTED}>Loading...</p>
      ) : (
        <>
          <NeoStatus state="fine" title={line.title} text={line.text} />
          <NumberCards numbers={data.numbers} />
          <DayChart title="New students per day" days={data.newPerDay} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Funnel" note="All time">
              <FunnelRows funnel={data.funnel} />
              <div className="h-2" />
            </Card>
            <Card title="Do students come back?" note="By signup week">
              <CohortTable cohorts={data.cohorts} />
            </Card>
            <Card title="Daily free limit" note="5 a day">
              <p className="px-4 text-2xl font-bold">
                {data.numbers.limitHits} <span className={`text-sm font-medium ${MUTED}`}>times a student hit it</span>
              </p>
              <p className={`px-4 pt-1 pb-4 text-sm ${MUTED}`}>When this starts growing, students want more than the free plan. That's the signal for paid plans.</p>
            </Card>
            <Card title="Cost" note="Every solve, team included">
              <dl className="grid grid-cols-[1fr_auto] gap-y-1 px-4 pb-4 text-sm">
                <dt>Tokens today</dt>
                <dd className="font-semibold">{data.cost.tokensToday.toLocaleString("en-IN")}</dd>
                <dt>Tokens per solve, average</dt>
                <dd className="font-semibold">{data.cost.avgTokensPerSolve.toLocaleString("en-IN")}</dd>
              </dl>
            </Card>
            <Card title="What they ask" note="Top topics">
              {data.topics.length > 0 ? <TopicRows topics={data.topics} /> : <p className={`px-4 pb-4 text-sm ${MUTED}`}>Nothing solved yet.</p>}
              <div className="h-2" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
