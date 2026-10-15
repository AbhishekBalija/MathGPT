import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDeleteWithUndo } from "../../features/solver/history/useDeleteWithUndo";
import adminService, { type StudentDetail } from "../../services/admin.service";
import { useAuthStore } from "../../stores/authStore";
import { CARD, MUTED } from "./overview/styles";
import { ConfirmInline } from "./shared/ConfirmInline";
import { DetailsPanel } from "./shared/DetailsPanel";
import { formatAdminTime } from "./shared/formatAdminTime";
import { Facts, Tag, Timeline, UndoBar } from "./shared/ListDetail";
import { ACTION, DANGER, TAG } from "./shared/listStyles";
import { useListAddress } from "./shared/useListAddress";
import { useAutoRefresh } from "./shared/useAutoRefresh";
import { useItem } from "./shared/useItem";

const BASE = "/admin/students";
const PROVIDERS: Record<string, string> = { google: "Google", email: "Email" };
const HISTORY_WORDS: Record<StudentDetail["history"][number]["kind"], string> = {
  solved: "Solved",
  failed: "Failed",
  reported: "Reported",
  joined: "",
};

const joinedFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

type Confirming = "admin" | "delete" | null;

interface StudentDetailsProps {
  student: StudentDetail;
  isTeam: boolean;
  isSelf: boolean;
  onToggleTeam: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}

function StudentDetails({ student, isTeam, isSelf, onToggleTeam, onChanged, onDeleted }: StudentDetailsProps) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirming(null);
      after();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't do that");
    } finally {
      setBusy(false);
    }
  };

  const solutions = `${student.solves} ${student.solves === 1 ? "solution" : "solutions"}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{student.name}</h2>
        {student.isAdmin ? <Tag className={TAG.feedback}>Admin</Tag> : isTeam ? <Tag className={TAG.plain}>Team</Tag> : null}
      </div>
      <Facts
        rows={[
          ["Email", `${student.email} · ${PROVIDERS[student.provider] ?? student.provider} sign-in`],
          ["Joined", joinedFormat.format(new Date(student.joinedAt))],
          ["Solves", `${student.solves} · failed ${student.failed} · reports ${student.reports}`],
          ["Today's limit", `${student.usedToday} of ${student.dailyLimit} free problems used`],
        ]}
      />
      <Timeline
        items={student.history.map((item, index) => ({
          key: `${item.at}-${index}`,
          content: (
            <>
              {item.kind === "joined" ? null : <b className="font-semibold text-gray-900 dark:text-gray-50">{HISTORY_WORDS[item.kind]} </b>}
              <span className="break-words">{item.title}</span> · {formatAdminTime(new Date(item.at))}
            </>
          ),
        }))}
      />
      {isSelf ? (
        <p className={`text-sm ${MUTED}`}>This is you, so your own role and account can't be changed here.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* Admins always count as team */}
          {student.isAdmin ? null : (
            <button type="button" onClick={onToggleTeam} className={ACTION}>
              {isTeam ? "Not team" : "Mark as team"}
            </button>
          )}
          <button type="button" onClick={() => setConfirming("admin")} className={ACTION}>
            {student.isAdmin ? "Remove admin" : "Make admin"}
          </button>
          <button type="button" onClick={() => setConfirming("delete")} className={DANGER}>
            Delete account
          </button>
        </div>
      )}
      {confirming === "admin" ? (
        <ConfirmInline
          message={student.isAdmin ? `Remove ${student.name}'s admin rights?` : `Make ${student.name} an admin? They can see every student and delete accounts.`}
          confirmLabel={student.isAdmin ? "Yes, remove" : "Yes, make admin"}
          onConfirm={() => run(() => adminService.updateUserRole(student.id, !student.isAdmin), onChanged)}
          onCancel={() => setConfirming(null)}
          busy={busy}
        />
      ) : null}
      {confirming === "delete" ? (
        <ConfirmInline
          message={`Delete ${student.name}'s account? Their ${solutions}, reports and feedback go too. Failed solves stay, without their name.`}
          confirmLabel="Yes, delete"
          onConfirm={() => run(() => adminService.deleteUser(student.id), onDeleted)}
          onCancel={() => setConfirming(null)}
          busy={busy}
        />
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

// Every account, newest first, with search.
export default function Students() {
  const address = useListAddress(BASE, "");
  const { user: me } = useAuthStore();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // Search once typing stops
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadList = useCallback(() => adminService.getUsers(1, 100, query || undefined), [query]);
  const { data, error, refresh } = useAutoRefresh(loadList);
  const shownQuery = useRef(query);
  useEffect(() => {
    if (shownQuery.current === query) return;
    shownQuery.current = query;
    refresh();
  }, [query, refresh]);

  const selected = useItem(adminService.getStudent, address.selectedId);

  // Team changes wait 5 seconds so they can be undone. While waiting, and once
  // saved, the new value shows straight away.
  const [teamSaved, setTeamSaved] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [teamTarget, setTeamTarget] = useState<ReadonlyMap<string, boolean>>(new Map());
  const { hidden: teamPending, toast, remove, undo } = useDeleteWithUndo(async (id) => {
    const isTeam = teamTarget.get(id);
    if (isTeam === undefined) return true;
    try {
      await adminService.setTeam(id, isTeam);
      setTeamSaved((saved) => new Map(saved).set(id, isTeam));
      return true;
    } catch {
      return false;
    }
  });

  const teamOf = (id: string, fromServer: boolean): boolean => {
    if (teamPending.has(id)) return teamTarget.get(id) ?? fromServer;
    return teamSaved.get(id) ?? fromServer;
  };

  const toggleTeam = (student: StudentDetail) => {
    setTeamTarget((targets) => new Map(targets).set(student.id, !teamOf(student.id, student.isTeam)));
    remove(student.id);
  };

  const users = data?.users ?? [];
  const pendingTarget = toast?.kind === "undo" ? teamTarget.get(toast.id) : undefined;

  return (
    <div className={address.selectedId ? "lg:grid lg:grid-cols-[minmax(0,1fr)_380px]" : ""}>
      <div className="min-w-0 p-4 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Students</h1>
          <p className={`text-sm ${MUTED}`}>{data ? `${data.total} ${data.total === 1 ? "account" : "accounts"}` : "Loading..."}</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search by name or email"
          className="mt-4 min-h-11 w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5"
        />
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-400/30 dark:bg-red-400/10">Couldn't load this. {error}</p> : null}
        <div className={`mt-3 overflow-hidden ${CARD}`}>
          {data && users.length === 0 ? <p className={`px-4 py-10 text-center text-sm ${MUTED}`}>{query ? "No one matches that." : "No accounts yet."}</p> : null}
          {users.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="hidden md:table-header-group">
                <tr className={`text-left text-[11px] font-semibold tracking-wider uppercase ${MUTED}`}>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Solves</th>
                  <th className="px-4 py-2.5">Last solve</th>
                  <th className="px-4 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelected = user.id === address.selectedId;
                  const isTeam = teamOf(user.id, user.isTeam);
                  return (
                    <tr
                      key={user.id}
                      className={`block border-t border-gray-200 py-2 first:border-t-0 md:table-row md:py-0 dark:border-white/10 ${
                        isSelected ? "bg-gray-50 dark:bg-white/5" : ""
                      }`}
                    >
                      <td className="block px-4 py-1 md:table-cell md:py-2.5">
                        <Link to={address.itemPath(user.id)} aria-current={isSelected ? "true" : undefined} className="inline-flex min-h-11 flex-col justify-center md:min-h-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            {user.name}
                            {user.isAdmin ? <Tag className={TAG.feedback}>Admin</Tag> : isTeam ? <Tag className={TAG.plain}>Team</Tag> : null}
                          </span>
                          <span className={`text-xs ${MUTED}`}>
                            {user.email} · {PROVIDERS[user.provider ?? ""] ?? user.provider}
                          </span>
                        </Link>
                      </td>
                      <td className="block px-4 py-0.5 md:table-cell md:py-2.5">
                        <span className={`md:hidden ${MUTED}`}>Solves: </span>
                        {user.solves}
                      </td>
                      <td className="block px-4 py-0.5 md:table-cell md:py-2.5">
                        <span className={`md:hidden ${MUTED}`}>Last solve: </span>
                        {user.lastSolvedAt ? formatAdminTime(new Date(user.lastSolvedAt)) : "never solved"}
                      </td>
                      <td className="block px-4 py-0.5 md:table-cell md:py-2.5">
                        <span className={`md:hidden ${MUTED}`}>Joined: </span>
                        {formatAdminTime(new Date(user.createdAt))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
      {address.selectedId ? (
        <DetailsPanel onClose={address.close}>
          {selected.data ? (
            <StudentDetails
              student={selected.data}
              isTeam={teamOf(selected.data.id, selected.data.isTeam)}
              isSelf={me?.id === selected.data.id}
              onToggleTeam={() => selected.data && toggleTeam(selected.data)}
              onChanged={() => {
                selected.reload();
                refresh();
              }}
              onDeleted={() => {
                address.close();
                refresh();
              }}
            />
          ) : (
            <p className={`text-sm ${MUTED}`}>{selected.error ? `Couldn't load this. ${selected.error}` : "Loading..."}</p>
          )}
        </DetailsPanel>
      ) : null}
      {toast ? <UndoBar message={pendingTarget === false ? "No longer team" : "Marked as team"} failed={toast.kind === "failed"} onUndo={undo} /> : null}
    </div>
  );
}
