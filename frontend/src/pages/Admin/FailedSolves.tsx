import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDeleteWithUndo } from "../../features/solver/history/useDeleteWithUndo";
import adminService, { type FailedDetail, type FailedStatus } from "../../services/admin.service";
import { MUTED } from "./overview/styles";
import { CopyForClaude } from "./shared/CopyForClaude";
import { errorLabel, seconds } from "./shared/errorLabels";
import { formatAdminTime } from "./shared/formatAdminTime";
import { EmptyList, Facts, FilterChip, ItemRow, ListDetail, OutsideLinks, Tag, Timeline, UndoBar } from "./shared/ListDetail";
import { ACTION, TAG } from "./shared/listStyles";
import { useListAddress } from "./shared/useListAddress";
import { useAutoRefresh } from "./shared/useAutoRefresh";
import { useItem } from "./shared/useItem";

const BASE = "/admin/failed";
const FILTERS: Array<{ value: FailedStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function toStatus(value: string): FailedStatus {
  return FILTERS.some((filter) => filter.value === value) ? (value as FailedStatus) : "open";
}

function FailedDetails({ group, onResolve }: { group: FailedDetail; onResolve: () => void }) {
  const latest = group.attempts.at(-1);
  // The newest try that has details; very old tries have none
  const details = [...group.attempts].reverse().find((attempt) => attempt.details !== null)?.details ?? null;
  return (
    <div>
      <Tag className={TAG.failed}>Failed solve · {plural(group.tries, "try", "tries")}</Tag>
      <h2 className="mt-2 text-base font-semibold whitespace-pre-wrap break-words">{group.problem}</h2>
      <Facts
        rows={[
          ["Student", group.student ? <Link to={`/admin/students/${group.student.id}`} className="underline underline-offset-2">{group.student.name}</Link> : "Deleted account"],
          ["Error", <span key="error">{errorLabel(group.errorCode)} <span className={`font-mono text-xs ${MUTED}`}>{group.errorCode}</span></span>],
          ...(details ? ([["Message", <span key="message" className="font-mono text-xs">{details.fullMessage}</span>]] as Array<[string, ReactNode]>) : []),
          ["Models tried", details ? details.attempts.map((attempt) => `${attempt.model}: ${attempt.error}`).join(" | ") : "not saved"],
          ...(details ? ([["Prompt", <span key="prompt" className="font-mono text-xs">{details.promptVersion}</span>]] as Array<[string, ReactNode]>) : []),
        ]}
      />
      {details ? null : (
        <p className="text-xs text-amber-700 dark:text-amber-400">Saved before details were kept, so the models and the full error are missing. New failures have them.</p>
      )}
      <Timeline
        items={[
          ...group.attempts.map((attempt, index) => ({
            key: `${attempt.at}-${index}`,
            content: (
              <>
                <b className="font-semibold text-gray-900 dark:text-gray-50">Try {index + 1}</b> failed{attempt.ms !== null ? ` after ${seconds(attempt.ms)}` : ""} · {formatAdminTime(new Date(attempt.at))}
              </>
            ),
          })),
          {
            key: "later",
            content: group.workedLater ? (
              <b className="font-semibold text-emerald-700 dark:text-emerald-400">Worked on a later try</b>
            ) : (
              <b className="font-semibold text-gray-900 dark:text-gray-50">Not solved since</b>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <CopyForClaude
          input={{
            kind: "failed",
            id: group.id,
            adminPath: `${BASE}/${group.id}`,
            at: new Date(group.lastAt),
            ms: latest?.ms ?? null,
            errorCode: group.errorCode,
            fullMessage: details?.fullMessage,
            attempts: details?.attempts,
            promptVersion: details?.promptVersion,
            problem: group.problem,
          }}
        />
        {group.resolved ? null : (
          <button type="button" onClick={onResolve} className={ACTION}>
            {group.tries === 1 ? "Mark resolved" : `Mark all ${group.tries} resolved`}
          </button>
        )}
        <OutsideLinks id={group.id} at={new Date(group.lastAt)} />
      </div>
    </div>
  );
}

// Failed solves, one row per student and problem, newest first.
export default function FailedSolves() {
  const address = useListAddress(BASE, "open");
  const status = toStatus(address.filter);
  const loadList = useCallback(async () => ({ status, ...(await adminService.getFailed(status)) }), [status]);
  const { data: loaded, error, refresh } = useAutoRefresh(loadList);
  // Never show one filter's rows under another
  const data = loaded?.status === status ? loaded : null;
  const selected = useItem(adminService.getFailedDetail, address.selectedId);

  // A new filter loads straight away (the first load already runs)
  const shownStatus = useRef(status);
  useEffect(() => {
    if (shownStatus.current === status) return;
    shownStatus.current = status;
    refresh();
  }, [status, refresh]);

  // Resolved for good, so it stays off the list until the next load
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const { hidden, toast, remove, undo } = useDeleteWithUndo(async (id) => {
    try {
      await adminService.resolveFailed(id);
      setGone((ids) => new Set(ids).add(id));
      return true;
    } catch {
      return false;
    }
  });

  const groups = (data?.groups ?? []).filter((group) => !hidden.has(group.id) && !(status === "open" && gone.has(group.id)));
  const resolve = (id: string) => {
    remove(id);
    address.close();
  };

  return (
    <ListDetail
      title="Failed solves"
      summary={data ? `${plural(data.problems, "problem", "problems")} · ${plural(data.tries, "try", "tries")}` : "Loading..."}
      error={error}
      filters={FILTERS.map((filter) => (
        <FilterChip key={filter.value} to={address.filterPath(filter.value)} on={filter.value === status} label={filter.label} />
      ))}
      detail={
        address.selectedId && !hidden.has(address.selectedId) ? (
          selected.data ? (
            <FailedDetails group={selected.data} onResolve={() => resolve(selected.data?.id ?? "")} />
          ) : (
            <p className={`text-sm ${MUTED}`}>{selected.error ? `Couldn't load this. ${selected.error}` : "Loading..."}</p>
          )
        ) : null
      }
      onClose={address.close}
      footer={toast ? <UndoBar message="Marked resolved" failed={toast.kind === "failed"} onUndo={undo} /> : null}
    >
      {data && groups.length === 0 ? <EmptyList>{status === "open" ? "Nothing failed. All clear." : "Nothing here."}</EmptyList> : null}
      {groups.map((group) => (
        <ItemRow
          key={group.id}
          to={address.itemPath(group.id)}
          selected={group.id === address.selectedId}
          tag={<Tag className={TAG.failed}>{errorLabel(group.errorCode)}</Tag>}
          title={
            <>
              {group.problem}
              {group.tries > 1 ? <span className="ml-1.5 rounded-md bg-gray-100 px-1.5 text-[11px] font-bold dark:bg-white/10">×{group.tries}</span> : null}
            </>
          }
          sub={
            <>
              {[group.ms !== null ? seconds(group.ms) : null, group.student?.name ?? "Deleted account"].filter(Boolean).join(" · ")}
              {group.workedLater ? (
                <>
                  {" · "}
                  <span className="text-emerald-700 dark:text-emerald-400">worked on the next try</span>
                </>
              ) : null}
            </>
          }
          at={group.lastAt}
        />
      ))}
    </ListDetail>
  );
}
