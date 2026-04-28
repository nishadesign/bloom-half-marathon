"use client";
import { useState } from "react";

export default function DashboardActions({ connected }: { connected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const syncRes = await fetch("/api/strava/sync", { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncRes.ok) {
        setMessage(`Sync error: ${syncData.error}`);
        return;
      }
      const calRes = await fetch("/api/strava/fetch-calories", { method: "POST" });
      const calData = await calRes.json();
      if (!calRes.ok) {
        setMessage(`Calories error: ${calData.error}`);
        return;
      }
      setMessage(
        `Synced ${syncData.synced} activities · ${calData.updated} calories fetched`,
      );
    } finally {
      setBusy(false);
      location.reload();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-xs sm:gap-sm sm:items-center">
      {!connected ? (
        <a href="/api/strava/connect" className="btn-primary w-full sm:w-auto">
          Connect Strava
        </a>
      ) : (
        <button onClick={sync} disabled={busy} className="btn-primary w-full sm:w-auto">
          {busy ? "Syncing…" : "Sync Strava"}
        </button>
      )}
      {message && (
        <span className="display-italic text-[14px] text-smoke">{message}</span>
      )}
    </div>
  );
}
