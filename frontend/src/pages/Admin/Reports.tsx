import { useState } from "react";
import { Link } from "react-router-dom";
import { Math } from "../../features/solver/blocks/Math";
import adminService, { type ReportCacheStatus, type ReportDetail, type ReportItem } from "../../services/admin.service";
import { MUTED } from "./overview/styles";
import { ConfirmInline } from "./shared/ConfirmInline";
import { CopyForClaude } from "./shared/CopyForClaude";
import { formatAdminTime } from "./shared/formatAdminTime";
import { EmptyList, Facts, FilterChip, ItemRow, ListDetail, OutsideLinks, Tag, Timeline } from "./shared/ListDetail";
import { ACTION, TAG } from "./shared/listStyles";
import { useListAddress } from "./shared/useListAddress";
import { useAutoRefresh } from "./shared/useAutoRefresh";
import { useItem } from "./shared/useItem";

const BASE = "/admin/reports";

// What each cache status means for other students, in plain words
const CACHE_TEXT: Record<NonNullable<ReportCacheStatus>, string> = {
  blocked: "Blocked: not served to anyone",
  shared: "Unblocked: served from the cache again",
  unchecked: "Unblocked: never checked, so not served",
};

function cacheText(status: ReportCacheStatus): string {
  return status ? CACHE_TEXT[status] : "Instant answer: never cached";
}

const FILTERS = [
  { value: "blocked", label: "Blocked", matches: (report: ReportItem) => report.cacheStatus === "blocked" },
  { value: "unblocked", label: "Unblocked", matches: (report: ReportItem) => report.cacheStatus !== "blocked" },
  { value: "all", label: "All", matches: () => true },
];

function ReportDetails({ report, onUnblocked }: { report: ReportDetail; onUnblocked: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unblock = async () => {
    setBusy(true);
    try {
      await adminService.unblockReport(report.id);
      setConfirming(false);
      onUnblocked();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't unblock it");
    } finally {
      setBusy(false);
    }
  };

  const answer = report.answerText ?? report.solution?.answer.latex ?? report.solution?.answer.text ?? "";
  return (
    <div>
      <Tag className={TAG.report}>Report · {report.cacheStatus === "blocked" ? "blocked" : "unblocked"}</Tag>
      <h2 className="mt-2 text-base font-semibold whitespace-pre-wrap break-words">{report.problemText ?? "Problem not saved"}</h2>
      <Facts
        rows={[
          ["Answer", answer ? <Math latex={answer} /> : "not saved"],
          ["Reason", report.reason ?? "No reason given"],
          ["Cache", cacheText(report.cacheStatus)],
          ["Answer check", report.checkedByCode ? "Checked by code, and it agreed" : "Not checked by code"],
          ["Student", <Link key="student" to={`/admin/students/${report.student.id}`} className="underline underline-offset-2">{report.student.name}</Link>],
        ]}
      />
      <Timeline
        items={[
          ...(report.solvedAt ? [{ key: "solved", content: <><b className="font-semibold text-gray-900 dark:text-gray-50">{report.student.name}</b> solved it · {formatAdminTime(new Date(report.solvedAt))}</> }] : []),
          { key: "reported", content: <><b className="font-semibold text-gray-900 dark:text-gray-50">{report.student.name}</b> tapped "Something looks wrong" · {formatAdminTime(new Date(report.createdAt))}</> },
        ]}
      />
      {report.solution ? (
        <details className="mb-4 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">The full solution</summary>
          <ol className="list-decimal space-y-2 pl-5">
            {report.solution.steps.map((step, index) => (
              <li key={index}>
                <p>{step.reason}</p>
                {step.block?.latex ? <Math latex={step.block.latex} /> : step.block?.text ? <p className={MUTED}>{step.block.text}</p> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : (
        <p className={`mb-4 text-sm ${MUTED}`}>The student deleted this solution.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <CopyForClaude
          input={{
            kind: "report",
            id: report.id,
            adminPath: `${BASE}/${report.id}`,
            at: new Date(report.createdAt),
            ms: null,
            problem: report.problemText ?? "",
            answer,
            checkedByCode: report.checkedByCode,
            message: report.reason ?? undefined,
          }}
        />
        {report.cacheStatus === "blocked" && !confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className={ACTION}>
            Unblock answer
          </button>
        ) : null}
        <OutsideLinks id={report.id} at={new Date(report.createdAt)} />
      </div>
      {confirming ? (
        <ConfirmInline
          message="Unblock and share this answer with everyone?"
          confirmLabel="Yes, unblock"
          onConfirm={unblock}
          onCancel={() => setConfirming(false)}
          busy={busy}
        />
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

// Answers students said look wrong. A report blocks the answer from the shared cache.
export default function Reports() {
  const address = useListAddress(BASE, "blocked");
  const { data, error, refresh } = useAutoRefresh(adminService.getReports);
  const selected = useItem(adminService.getReportDetail, address.selectedId);
  const filter = FILTERS.find((entry) => entry.value === address.filter) ?? FILTERS[0];
  const reports = data?.reports ?? [];
  const shown = reports.filter(filter.matches);

  return (
    <ListDetail
      title="Reports"
      summary="Answers students said look wrong"
      error={error}
      filters={FILTERS.map((entry) => (
        <FilterChip key={entry.value} to={address.filterPath(entry.value)} on={entry === filter} label={entry.label} count={reports.filter(entry.matches).length} />
      ))}
      detail={
        address.selectedId ? (
          selected.data ? (
            <ReportDetails
              report={selected.data}
              onUnblocked={() => {
                // Other reports on the same answer change too
                refresh();
                selected.reload();
              }}
            />
          ) : (
            <p className={`text-sm ${MUTED}`}>{selected.error ? `Couldn't load this. ${selected.error}` : "Loading..."}</p>
          )
        ) : null
      }
      onClose={address.close}
    >
      {data && shown.length === 0 ? <EmptyList>{filter.value === "blocked" ? "No blocked answers." : "No reports here."}</EmptyList> : null}
      {shown.map((report) => (
        <ItemRow
          key={report.id}
          to={address.itemPath(report.id)}
          selected={report.id === address.selectedId}
          tag={<Tag className={TAG.report}>Report</Tag>}
          title={report.problemText ?? "Problem not saved"}
          sub={
            <>
              {report.answerText ? <>Answer <Math latex={report.answerText} /> · </> : null}
              {report.reason ? `"${report.reason}"` : "no reason given"} · {cacheText(report.cacheStatus)}
            </>
          }
          at={report.createdAt}
        />
      ))}
    </ListDetail>
  );
}
