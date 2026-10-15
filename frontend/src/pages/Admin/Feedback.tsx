import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useDeleteWithUndo } from "../../features/solver/history/useDeleteWithUndo";
import adminService, { type FeedbackItem } from "../../services/admin.service";
import { MUTED } from "./overview/styles";
import { CopyForClaude } from "./shared/CopyForClaude";
import { EmptyList, Facts, FilterChip, ItemRow, ListDetail, OutsideLinks, Tag, UndoBar } from "./shared/ListDetail";
import { ACTION, TAG } from "./shared/listStyles";
import { useListAddress } from "./shared/useListAddress";
import { useAutoRefresh } from "./shared/useAutoRefresh";

const BASE = "/admin/feedback";

const KIND_NAMES: Record<FeedbackItem["kind"], string> = { bug: "Bug", idea: "Idea", other: "Other" };

const FILTERS: Array<{ value: string; label: string; matches: (item: FeedbackItem) => boolean }> = [
  { value: "open", label: "Open", matches: (item) => !item.done },
  { value: "done", label: "Done", matches: (item) => item.done },
  { value: "bug", label: "Bug", matches: (item) => item.kind === "bug" },
  { value: "idea", label: "Idea", matches: (item) => item.kind === "idea" },
  { value: "other", label: "Other", matches: (item) => item.kind === "other" },
];

function where(item: FeedbackItem): string {
  return [item.page ? `On ${item.page}` : null, item.solutionId ? "had a solution open" : null].filter(Boolean).join(" · ") || "No page saved";
}

function FeedbackDetails({ item, onDone }: { item: FeedbackItem; onDone: () => void }) {
  return (
    <div>
      <Tag className={TAG.feedback}>Feedback · {KIND_NAMES[item.kind]}</Tag>
      {/* Plain text, kept as written, so line breaks show */}
      <h2 className="mt-2 text-base font-semibold whitespace-pre-wrap break-words">{item.message}</h2>
      <Facts
        rows={[
          ["From", <span key="from"><Link to={`/admin/students/${item.userId}`} className="underline underline-offset-2">{item.name}</Link> · {item.email}</span>],
          ["Page", where(item)],
          ["Type", KIND_NAMES[item.kind]],
          ["Status", item.done ? "Done" : "Open"],
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {/* The note never carries who sent it */}
        <CopyForClaude
          input={{
            kind: "feedback",
            id: item.id,
            adminPath: `${BASE}/${item.id}`,
            at: new Date(item.createdAt),
            ms: null,
            problem: where(item),
            message: item.message,
          }}
        />
        {item.done ? null : (
          <button type="button" onClick={onDone} className={ACTION}>
            Mark done
          </button>
        )}
        <OutsideLinks id={item.id} at={new Date(item.createdAt)} />
      </div>
    </div>
  );
}

// What students tell us about the app.
export default function Feedback() {
  const address = useListAddress(BASE, "open");
  // Done items too, so every filter works from one load (the most the API gives)
  const loadAll = useCallback(() => adminService.getFeedback({ includeDone: true, limit: 200 }), []);
  const { data, error } = useAutoRefresh(loadAll);

  // Saved as done, so it shows as done until the next load
  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(new Set());
  const { hidden, toast, remove, undo } = useDeleteWithUndo(async (id) => {
    try {
      await adminService.markFeedbackDone(id);
      setDoneIds((ids) => new Set(ids).add(id));
      return true;
    } catch {
      return false;
    }
  });

  const items = (data?.feedback ?? []).map((item) => (doneIds.has(item.id) ? { ...item, done: true } : item)).filter((item) => !hidden.has(item.id));
  const filter = FILTERS.find((entry) => entry.value === address.filter) ?? FILTERS[0];
  const shown = items.filter(filter.matches);
  const selected = items.find((item) => item.id === address.selectedId) ?? null;

  return (
    <ListDetail
      title="Feedback"
      summary="What students tell us about the app"
      error={error}
      filters={FILTERS.map((entry) => (
        <FilterChip key={entry.value} to={address.filterPath(entry.value)} on={entry === filter} label={entry.label} count={items.filter(entry.matches).length} />
      ))}
      detail={
        address.selectedId ? (
          selected ? (
            <FeedbackDetails
              item={selected}
              onDone={() => {
                remove(selected.id);
                address.close();
              }}
            />
          ) : (
            <p className={`text-sm ${MUTED}`}>{data ? "This feedback is not in the list." : "Loading..."}</p>
          )
        ) : null
      }
      onClose={address.close}
      footer={toast ? <UndoBar message="Marked done" failed={toast.kind === "failed"} onUndo={undo} /> : null}
    >
      {data && shown.length === 0 ? (
        <EmptyList>
          <img src="/brand/neo.svg" alt="" className="mx-auto mb-2 w-14" />
          {filter.value === "open" ? "Nothing open. All caught up." : "Nothing here."}
        </EmptyList>
      ) : null}
      {shown.map((item) => (
        <ItemRow
          key={item.id}
          to={address.itemPath(item.id)}
          selected={item.id === address.selectedId}
          tag={<Tag className={TAG.feedback}>{KIND_NAMES[item.kind]}</Tag>}
          title={item.message}
          sub={`${where(item)} · ${item.name}${item.done ? " · done" : ""}`}
          at={item.createdAt}
        />
      ))}
    </ListDetail>
  );
}
