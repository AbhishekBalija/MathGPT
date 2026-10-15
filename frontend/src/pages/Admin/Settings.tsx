import { useCallback, useEffect, useState } from "react";
import adminService, { type AdminSettings, type AdminSettingsResponse, type SettingChange } from "../../services/admin.service";
import { useAppStatus } from "../../stores/appStatusStore";
import { useAuthStore } from "../../stores/authStore";
import { Card } from "./overview/cards";
import { MUTED } from "./overview/styles";
import { ConfirmInline } from "./shared/ConfirmInline";
import { formatAdminTime } from "./shared/formatAdminTime";
import { ACTION } from "./shared/listStyles";

const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const MAX_MESSAGE = 300;

type Confirming = "signups" | "maintenance" | null;

// An on/off switch, as a button so it works with the keyboard and screen readers
function Switch({ label, on, onToggle, disabled }: { label: string; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex min-h-11 min-w-16 items-center rounded-full px-1 disabled:opacity-50 ${on ? "bg-emerald-600 dark:bg-emerald-500" : "bg-gray-300 dark:bg-white/20"}`}
    >
      <span className={`size-7 rounded-full bg-white shadow ${on ? "translate-x-7" : ""}`} />
    </button>
  );
}

// "You changed free problems per day from 5 to 6"
function describe(change: SettingChange, myId: string | undefined): string {
  const who = change.by ? (change.by.id === myId ? "You" : change.by.name) : "A deleted admin";
  if (change.key === "dailyLimit") return `${who} changed free problems per day from ${String(change.oldValue)} to ${String(change.newValue)}`;
  if (change.key === "signupsOpen") return `${who} ${change.newValue === false ? "paused" : "opened"} new sign-ups`;
  const before = change.oldValue as AdminSettings["maintenance"];
  const after = change.newValue as AdminSettings["maintenance"];
  if (before.on !== after.on) return `${who} turned maintenance mode ${after.on ? "on" : "off"}`;
  return `${who} changed the maintenance message`;
}

// The daily limit, sign-ups and maintenance mode, with no deploy.
export default function Settings() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AdminSettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<Confirming>(null);

  const show = useCallback((next: AdminSettingsResponse) => {
    setData(next);
    setLimit(next.settings.dailyLimit);
    setMessage(next.settings.maintenance.message);
  }, []);

  useEffect(() => {
    adminService.getSettings().then(show, (failure: unknown) => setError(failure instanceof Error ? failure.message : "Couldn't load this"));
  }, [show]);

  const save = async (change: Partial<AdminSettings>) => {
    setBusy(true);
    setError(null);
    try {
      show(await adminService.updateSettings(change));
      setConfirming(null);
      // The nav's "Paused" tag and the Overview read this
      void useAppStatus.getState().load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  };

  if (!data || limit === null) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className={`mt-6 ${error ? "text-red-600 dark:text-red-400" : MUTED}`}>{error ? `Couldn't load this. ${error}` : "Loading..."}</p>
      </div>
    );
  }

  const { settings, changes } = data;
  const limitChanged = limit !== settings.dailyLimit;
  const trimmed = message.trim();
  const messageValid = trimmed.length > 0 && trimmed.length <= MAX_MESSAGE;
  const messageChanged = trimmed !== settings.maintenance.message;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className={`text-sm ${MUTED}`}>Changes apply within 15 seconds, no deploy</p>
      </div>
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-400/30 dark:bg-red-400/10">{error}</p> : null}

      <Card title="Free problems per day">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="One less free problem" disabled={limit <= MIN_LIMIT} onClick={() => setLimit(limit - 1)} className={`${ACTION} min-w-11 disabled:opacity-40`}>
              −
            </button>
            <span className="min-w-8 text-center text-2xl font-bold" aria-live="polite">
              {limit}
            </span>
            <button type="button" aria-label="One more free problem" disabled={limit >= MAX_LIMIT} onClick={() => setLimit(limit + 1)} className={`${ACTION} min-w-11 disabled:opacity-40`}>
              +
            </button>
          </div>
          {limitChanged ? (
            <>
              <button
                type="button"
                onClick={() => save({ dailyLimit: limit })}
                disabled={busy}
                className="min-h-11 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900"
              >
                Save
              </button>
              <button type="button" onClick={() => setLimit(settings.dailyLimit)} className={ACTION}>
                Undo
              </button>
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Changed from {settings.dailyLimit} to {limit}, not saved yet
              </span>
            </>
          ) : null}
        </div>
        <p className={`px-4 pb-4 text-sm ${MUTED}`}>Each student gets this many AI answers a day, from midnight India time. Instant and saved answers don't count. Admins have no limit.</p>
      </Card>

      <Card title="New sign-ups" note={settings.signupsOpen ? "Open" : "Paused"}>
        <div className="flex items-center justify-between gap-4 px-4 pb-4">
          <p className={`text-sm ${MUTED}`}>Turn off to stop new accounts, for example during spam or a cost spike. Existing students can still log in.</p>
          <Switch
            label="New sign-ups"
            on={settings.signupsOpen}
            disabled={busy}
            // Pausing stops people, so it asks first; opening again doesn't
            onToggle={() => (settings.signupsOpen ? setConfirming("signups") : void save({ signupsOpen: true }))}
          />
        </div>
        {confirming === "signups" ? (
          <div className="px-4 pb-4">
            <ConfirmInline
              message="Pause new sign-ups? New students can't make an account until you turn this back on."
              confirmLabel="Yes, pause sign-ups"
              onConfirm={() => save({ signupsOpen: false })}
              onCancel={() => setConfirming(null)}
              busy={busy}
            />
          </div>
        ) : null}
      </Card>

      <Card title="Maintenance mode" note={settings.maintenance.on ? "On: students can't solve" : "Off"}>
        <div className="flex items-center justify-between gap-4 px-4 pb-3">
          <p className={`text-sm ${MUTED}`}>Pauses solving for students and shows them this message. You and other team accounts can still solve.</p>
          <Switch
            label="Maintenance mode"
            on={settings.maintenance.on}
            disabled={busy || (!settings.maintenance.on && !messageValid)}
            onToggle={() => (settings.maintenance.on ? void save({ maintenance: { on: false, message: settings.maintenance.message } }) : setConfirming("maintenance"))}
          />
        </div>
        <label className="mx-4 mb-4 flex flex-col gap-1 text-sm">
          <span className="font-semibold">What students see</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MAX_MESSAGE}
            rows={3}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
          />
          <span className={`text-xs ${MUTED}`}>
            {trimmed.length} of {MAX_MESSAGE}. Shown in place of the Solve button. Their saved solutions still open.
          </span>
        </label>
        {settings.maintenance.on && messageChanged && messageValid ? (
          <div className="px-4 pb-4">
            <button type="button" onClick={() => save({ maintenance: { on: true, message: trimmed } })} disabled={busy} className={ACTION}>
              Save message
            </button>
          </div>
        ) : null}
        {confirming === "maintenance" && messageValid ? (
          <div className="px-4 pb-4">
            <ConfirmInline
              message="Turn on maintenance mode? Students can't solve until you turn it off."
              confirmLabel="Yes, pause solving"
              onConfirm={() => save({ maintenance: { on: true, message: trimmed } })}
              onCancel={() => setConfirming(null)}
              busy={busy}
            />
          </div>
        ) : null}
      </Card>

      <Card title="Changes" note="Who changed what">
        {changes.length === 0 ? (
          <p className={`px-4 pb-4 text-sm ${MUTED}`}>No changes yet. Each change shows here with who made it.</p>
        ) : (
          <ul aria-label="Changes" className="pb-2">
            {changes.map((change) => (
              <li key={change.id} className="border-t border-gray-200 px-4 py-2.5 text-sm dark:border-white/10">
                {describe(change, user?.id)} <span className={MUTED}>· {formatAdminTime(new Date(change.changedAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
