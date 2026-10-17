import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Plus, X } from "lucide-react";
import Logo from "../../components/brand/Logo";
import { solveProblem } from "../../services/solve.service";
import { reportSolution } from "../../services/history.service";
import { useAppDataStore } from "../../stores/appDataStore";
import { useAppStatus } from "../../stores/appStatusStore";
import { useAuthStore } from "../../stores/authStore";
import { useChatStore, type Chat } from "../../stores/chatStore";
import { toSolveError } from "../../utils/errorMessages";
import { InlineText } from "./blocks/InlineText";
import { Math } from "./blocks/Math";
import { Composer } from "./composer/Composer";
import { SlimComposer } from "./composer/SlimComposer";
import { HistorySidebar, type HistoryEntry } from "./history/HistorySidebar";
import { PrevNext } from "./history/PrevNext";
import { useDeleteWithUndo } from "./history/useDeleteWithUndo";
import type { SolutionV2 } from "./model/solution";
import { SolutionView } from "./SolutionView";
import { EmptyState } from "./states/EmptyState";
import { ErrorState } from "./states/ErrorState";
import { HintCard } from "./states/HintCard";
import { ThinkingState } from "./states/ThinkingState";

type View = "all" | "one" | "hint";

interface SolveOptions {
  // Solve again with another method (an id from the solution's alternatives).
  method?: string;
  // Replace the solution of this chat instead of starting a new one.
  chatId?: string;
}

const PHONE_QUERY = "(max-width: 639px)";

// True on phones. Used so only one input is on the page at a time.
function useIsPhone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(PHONE_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

// What the sidebar shows for a chat: the problem the student typed.
function problemOf(chat: Chat): string {
  return chat.messages[0]?.content ?? chat.title;
}

// A chat is worth listing once it has a solution (loaded or saved on the server).
function isSaved(chat: Chat): boolean {
  return Boolean(chat.solution || chat.solutionId);
}

export function SolverPage() {
  const navigate = useNavigate();
  const isPhone = useIsPhone();

  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const isLoading = useChatStore((s) => s.isLoading);
  const solutionLoading = useChatStore((s) => s.solutionLoading);
  const historyLoaded = useChatStore((s) => s.historyLoaded);
  const solveError = useChatStore((s) => s.solveError);
  const pendingProblem = useChatStore((s) => s.pendingProblem);
  const view = useChatStore((s) => s.view);

  const emailVerified = useAuthStore((s) => s.user?.emailVerified);
  // Only admins can still solve while solving is paused; team accounts see what students see
  const isAdmin = useAuthStore((s) => Boolean(s.user?.isAdmin));
  const maintenance = useAppStatus((s) => s.status?.maintenance);
  const loadAppStatus = useAppStatus((s) => s.load);
  const pausedMessage = maintenance?.on && !isAdmin ? maintenance.message : null;
  const maintenanceNotice = maintenance?.on && isAdmin ? maintenance.message : null;
  // Check on load and whenever the tab comes back; while paused, also every
  // 30 seconds, so the composer returns without a reload when solving resumes
  useEffect(() => {
    void loadAppStatus();
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadAppStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAppStatus]);
  // While paused (or, for admins, while the notice shows) check every 30 s,
  // so the page catches up when maintenance ends without a reload
  const maintenanceOn = Boolean(pausedMessage || maintenanceNotice);
  useEffect(() => {
    if (!maintenanceOn) return;
    const timer = setInterval(() => void loadAppStatus(), 30_000);
    return () => clearInterval(timer);
  }, [maintenanceOn, loadAppStatus]);

  const setEmailVerified = useAuthStore((s) => s.setEmailVerified);
  const { history, isInitialized, historyLoading } = useAppDataStore();

  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [phoneInputOpen, setPhoneInputOpen] = useState(false);
  // Counts the solves of each chat, so a re-solve always gets a new solution id.
  const [solveCount, setSolveCount] = useState<Record<string, number>>({});

  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  const lastOptionsRef = useRef<SolveOptions>({});
  const composerRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLDivElement>(null);

  // Delete with Undo. The real delete runs quietly (no full-screen overlay).
  const { hidden, toast, remove, undo } = useDeleteWithUndo(
    useCallback(async (id: string) => {
      const store = useChatStore.getState();
      const chat = store.chats.find((c) => c.id === id);
      if (!chat) return true;
      return store.deleteChat(id, chat.solutionId ?? chat.solution?.id, { silent: true });
    }, []),
  );

  // Bring the saved history into the chat list once it has loaded.
  useEffect(() => {
    if (isInitialized && history.length > 0 && !historyLoaded) {
      useChatStore.getState().loadHistory(history);
    }
  }, [isInitialized, history, historyLoaded]);

  // Free problems left today, from the shared profile. Asked again after every solve.
  const remaining = useAppDataStore((s) => s.profile?.dailyCredits?.remaining);
  const dailyLimit = useAppDataStore((s) => s.profile?.dailyCredits?.limit);
  const hasProfile = useAppDataStore((s) => s.profile !== null);
  useEffect(() => {
    // Usually already loading from the app start; this joins that request
    if (!hasProfile) void useAppDataStore.getState().refreshProfile();
  }, [hasProfile]);

  const saved = useMemo(() => chats.filter((chat) => isSaved(chat) && !hidden.has(chat.id)), [chats, hidden]);

  const entries: HistoryEntry[] = useMemo(
    () =>
      [...saved]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((chat) => ({ id: chat.id, problem: problemOf(chat), createdAt: chat.createdAt.toISOString() })),
    [saved],
  );

  // Oldest first, so "Problem 1" is the first one the student solved.
  const ordered = useMemo(() => [...saved].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), [saved]);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const activeSolution: SolutionV2 | null = useMemo(() => {
    if (!activeChat?.solution) return null;
    const solution = activeChat.solution;
    return { ...solution, id: `${solution.id}:${solveCount[activeChat.id] ?? 0}` };
  }, [activeChat, solveCount]);

  // The real server id, without the ":n" re-render suffix, for reports
  const savedSolutionId = activeChat?.solution?.id;

  const position = activeChat ? ordered.findIndex((chat) => chat.id === activeChat.id) + 1 : 0;

  function focusComposer() {
    if (isPhone) {
      setPhoneInputOpen(true);
      return;
    }
    composerRef.current?.querySelector("textarea")?.focus();
  }

  // On the phone's full-screen input, put the cursor in the field.
  useEffect(() => {
    if (!phoneInputOpen) return;
    const frame = requestAnimationFrame(() => phoneInputRef.current?.querySelector("textarea")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phoneInputOpen]);

  const solve = useCallback(
    async (problem: string, nextView: View, options: SolveOptions = {}) => {
      // Known to be unverified: go verify first, the typed problem stays in the box
      if (emailVerified === false) {
        navigate("/verify-email", { state: { sendCode: true } });
        return;
      }

      const store = useChatStore.getState();
      let chatId = options.chatId;
      if (!chatId) {
        // A chat that never got a solution (cancelled or failed) is reused
        const current = store.chats.find((chat) => chat.id === store.activeChatId);
        chatId = current && !isSaved(current) ? current.id : store.createNewChat();
      }

      lastOptionsRef.current = options;
      store.setSolveError(null);
      store.setPendingProblem(problem);
      store.setView(nextView);
      store.setLoading(true);
      setPhoneInputOpen(false);

      const controller = new AbortController();
      abortRef.current = controller;
      const run = ++runRef.current;

      const result = await solveProblem({
        problem,
        chatId,
        method: options.method,
        signal: controller.signal,
      });

      // Cancelled, or a newer request took over: drop this answer
      if (run !== runRef.current || result.aborted) return;
      const after = useChatStore.getState();
      after.setLoading(false);

      if (result.code === "EMAIL_NOT_VERIFIED") {
        setEmailVerified(false);
        navigate("/verify-email", { state: { sendCode: true } });
        return;
      }

      if (result.success && result.solution) {
        const chat = after.chats.find((c) => c.id === chatId);
        if (chat && chat.messages.length === 0) {
          after.addMessage(chatId, { role: "user", content: problem });
        }
        after.setSolution(chatId, result.solution);
        setSolveCount((counts) => ({ ...counts, [chatId]: (counts[chatId] ?? 0) + 1 }));
        after.setPendingProblem(null);
        setInput("");
        void useAppDataStore.getState().refreshProfile();
        return;
      }

      // The problem stays in the field and in pendingProblem, so nothing is lost
      after.setSolveError(toSolveError(result.failure ?? { status: 500 }, problem));
      // Solving was paused since the page loaded: show the message in the composer too
      if (result.failure?.code === "MAINTENANCE") void loadAppStatus();
    },
    [emailVerified, navigate, setEmailVerified, loadAppStatus],
  );

  function cancelSolve() {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    const store = useChatStore.getState();
    store.setLoading(false);
    store.setSolveError(null);
  }

  function retry() {
    const problem = pendingProblem ?? input.trim();
    if (problem) void solve(problem, view, lastOptionsRef.current);
  }

  function newProblem() {
    const store = useChatStore.getState();
    const current = store.chats.find((chat) => chat.id === store.activeChatId);
    // An empty chat is already a new problem, no need for another one
    if (!current || isSaved(current)) store.createNewChat();
    store.setSolveError(null);
    store.setPendingProblem(null);
    store.setView("all");
    setInput("");
    setPhoneInputOpen(false);
    setDrawerOpen(false);
  }

  function selectChat(id: string) {
    const store = useChatStore.getState();
    const chat = store.chats.find((c) => c.id === id);
    if (!chat) return;
    store.setActiveChat(id);
    if (chat.solutionId && !chat.solution) void store.fetchSolution(chat.id, chat.solutionId);
    store.setSolveError(null);
    store.setView("all");
    setDrawerOpen(false);
  }

  function goToProblem(offset: number) {
    const target = ordered[position - 1 + offset];
    if (target) selectChat(target.id);
  }

  function editProblem() {
    if (!activeChat) return;
    setInput(problemOf(activeChat));
    focusComposer();
  }

  function changeMethod(methodId: string) {
    if (!activeChat) return;
    void solve(problemOf(activeChat), view, { method: methodId, chatId: activeChat.id });
  }

  function removeChat(id: string) {
    remove(id);
    if (id === activeChatId) newProblem();
  }

  function clearAll() {
    if (confirm(`Delete all ${saved.length} problems? This cannot be undone.`)) {
      void useChatStore.getState().clearAllChats();
    }
  }

  function showFullSolution() {
    useChatStore.getState().setView("all");
  }

  // The hint comes with the solution, so no second request. Without one (old saved ones), show the full solution.
  const hint = activeSolution?.hint;
  const showHint = view === "hint" && Boolean(hint) && activeSolution !== null;
  const mode = view === "one" ? "one" : "all";

  const composer = (
    <Composer
      value={input}
      onChange={setInput}
      onSolve={(problem, nextView) => void solve(problem, nextView)}
      disabled={isLoading || solutionLoading}
      remaining={remaining}
      limit={dailyLimit}
      pausedMessage={pausedMessage}
      maintenanceNotice={maintenanceNotice}
    />
  );

  return (
    <div className="flex h-dvh min-w-0 bg-white text-gray-900 dark:bg-[#120d12] dark:text-gray-50">
      <HistorySidebar
        entries={entries}
        activeId={activeChatId}
        loading={historyLoading}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={selectChat}
        onNew={newProblem}
        onDelete={removeChat}
        onClearAll={clearAll}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-2 dark:border-white/10 sm:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open history"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <Logo height="18px" />
          <button
            type="button"
            onClick={newProblem}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
          >
            <Plus className="size-4" aria-hidden="true" />
            New
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={`mx-auto w-full max-w-180 px-4 pt-4 ${isPhone ? "pb-28" : "pb-8"}`}>
            {isLoading ? (
              <ThinkingState onCancel={cancelSolve} />
            ) : (
              <>
                {solveError ? (
                  <ErrorState
                    message={solveError.message}
                    retryAfter={solveError.retryAfter}
                    onRetry={retry}
                    onEdit={solveError.needsEdit ? focusComposer : undefined}
                    noAction={solveError.noAction}
                    helpline={solveError.helpline}
                  />
                ) : null}

                {solutionLoading ? (
                  <p role="status" className="mt-6 text-gray-600 dark:text-gray-400">
                    Opening your problem…
                  </p>
                ) : activeSolution ? (
                  <>
                    {ordered.length > 1 && position > 0 ? (
                      <div className="mb-2 flex justify-end">
                        <PrevNext
                          position={position}
                          total={ordered.length}
                          onPrev={() => goToProblem(-1)}
                          onNext={() => goToProblem(1)}
                        />
                      </div>
                    ) : null}
                    {showHint && hint ? (
                      <HintView solution={activeSolution} hint={hint} onShowSolution={showFullSolution} onTryIt={focusComposer} />
                    ) : (
                      <SolutionView
                        solution={activeSolution}
                        mode={mode}
                        onModeChange={(next) => useChatStore.getState().setView(next)}
                        onEdit={editProblem}
                        onNew={newProblem}
                        onMethodChange={changeMethod}
                        onReport={savedSolutionId ? () => reportSolution(savedSolutionId) : undefined}
                        renderNextStep={
                          isPhone
                            ? (next, shown, total) => <NextStepBar onNext={next} shown={shown} total={total} />
                            : undefined
                        }
                      />
                    )}
                  </>
                ) : solveError ? null : (
                  <EmptyState
                    onPick={(problem) => {
                      setInput(problem);
                      focusComposer();
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div ref={composerRef} className="shrink-0">
          {/* While solving is paused the notice shows on phones too, not only after a tap */}
          {isPhone && maintenanceNotice ? (
            <p role="status" className="mx-3 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-gray-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-gray-50">
              <b className="font-semibold">Maintenance mode is on.</b> Everyone else sees your message instead of the Solve button. You can still solve because you're an admin.
            </p>
          ) : null}
          {isPhone && !pausedMessage ? (
            <SlimComposer
              label={input.trim() || (activeSolution ? "Ask another problem" : "Type a problem")}
              onOpen={() => setPhoneInputOpen(true)}
            />
          ) : (
            composer
          )}
        </div>
      </main>

      {isPhone && phoneInputOpen ? (
        <div
          ref={phoneInputRef}
          role="dialog"
          aria-label="Ask a problem"
          className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#120d12]"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 dark:border-white/10">
            <h2 className="font-semibold">Ask a problem</h2>
            <button
              type="button"
              onClick={() => setPhoneInputOpen(false)}
              aria-label="Close"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {composer}
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 flex min-h-11 -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-900 pl-4 pr-1 text-sm text-white dark:bg-gray-50 dark:text-gray-900"
        >
          {toast.kind === "undo" ? (
            <>
              <span>Problem deleted ·</span>
              <button type="button" onClick={undo} className="min-h-11 px-3 font-semibold underline underline-offset-4">
                Undo
              </button>
            </>
          ) : (
            <span className="pr-3">Could not delete that. Try again.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

// The hint: the problem, then the hint card with what to do next.
function HintView({
  solution,
  hint,
  onShowSolution,
  onTryIt,
}: {
  solution: SolutionV2;
  hint: string;
  onShowSolution: () => void;
  onTryIt: () => void;
}) {
  const { problem } = solution;
  return (
    <section>
      <div className="mt-2 text-2xl">
        {problem.latex ? <Math latex={problem.latex} display /> : null}
        {problem.text ? (
          <p className="text-lg">
            <InlineText text={problem.text} />
          </p>
        ) : null}
      </div>
      {problem.task ? (
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          <InlineText text={problem.task} />
        </p>
      ) : null}
      <HintCard hint={hint} onShowSolution={onShowSolution} onTryIt={onTryIt} />
    </section>
  );
}

// Phone only: sits at the bottom of the screen where the input normally is.
function NextStepBar({ onNext, shown, total }: { onNext: () => void; shown: number; total: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-gray-200 bg-white px-3 pb-4 pt-3 dark:border-white/10 dark:bg-[#120d12]">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Step {shown} of {total}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="ml-auto min-h-11 flex-1 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white dark:bg-gray-50 dark:text-gray-900"
      >
        Next step
      </button>
    </div>
  );
}
