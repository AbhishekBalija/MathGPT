import { useState, useEffect, useCallback } from "react";
import { Mail, Clock, CheckCircle, UserPlus, AlertCircle } from "lucide-react";
import { adminService, type WaitlistEntry } from "../../services/admin.service";

const Waitlist = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    registered: 0,
  });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchWaitlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getWaitlist();
      setEntries(data.entries);
      setCounts(data.counts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waitlist");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleInvite = async (email: string) => {
    setInvitingEmail(email);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminService.inviteUser(email);
      setSuccessMessage(`Invite sent to ${email}`);
      await fetchWaitlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInvitingEmail(null);
    }
  };

  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const handleResendConfirmation = async (email: string) => {
    setResendingEmail(email);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminService.resendConfirmation(email);
      setSuccessMessage(`Confirmation email resent to ${email}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resend confirmation"
      );
    } finally {
      setResendingEmail(null);
    }
  };

  const getStatusBadge = (entry: WaitlistEntry) => {
    if (entry.status === "registered") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <CheckCircle className="w-3 h-3" />
          Registered
        </span>
      );
    }
    if (entry.status === "approved") {
      const isExpired = entry.inviteExpired;
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${
            isExpired
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          }`}
        >
          {isExpired ? (
            <>
              <AlertCircle className="w-3 h-3" />
              Expired
            </>
          ) : (
            <>
              <Mail className="w-3 h-3" />
              Invited
            </>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Waitlist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage waitlist signups and send invites
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {total} total signups
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {counts.pending}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {counts.approved}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Invited</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {counts.registered}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registered</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Source
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Joined
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-6 py-4">
                      <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    No waitlist signups yet
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.email}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(entry)}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {entry.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleResendConfirmation(entry.email)
                              }
                              disabled={resendingEmail === entry.email}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                              {resendingEmail === entry.email ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <Mail className="w-3 h-3" />
                              )}
                              Resend Confirm
                            </button>
                            <button
                              onClick={() => handleInvite(entry.email)}
                              disabled={invitingEmail === entry.email}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all disabled:opacity-50"
                            >
                              {invitingEmail === entry.email ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <UserPlus className="w-3 h-3" />
                              )}
                              Invite
                            </button>
                          </>
                        )}
                        {entry.status === "approved" && entry.inviteExpired && (
                          <button
                            onClick={() => handleInvite(entry.email)}
                            disabled={invitingEmail === entry.email}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-all disabled:opacity-50"
                          >
                            {invitingEmail === entry.email ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                            Resend Invite
                          </button>
                        )}
                        {entry.status === "approved" &&
                          !entry.inviteExpired && (
                            <span className="text-xs text-gray-400">
                              Awaiting registration
                            </span>
                          )}
                        {entry.status === "registered" && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
