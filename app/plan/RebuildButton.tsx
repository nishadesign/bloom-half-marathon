"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RebuildButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rebuild = async () => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plan/rebuild", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error ?? "unknown"}`);
        return;
      }
      const fallback = data.weeksFallback
        ? ` (${data.weeksFallback} fallback)`
        : "";
      setMessage(`Generated ${data.weeksGenerated} weeks${fallback}.`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "unknown error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-xs sm:gap-sm sm:items-center">
      <button onClick={rebuild} disabled={pending} className="btn-primary">
        {pending ? "Rebuilding…" : "Rebuild plan"}
      </button>
      {message && (
        <span className="display-italic text-[14px] text-smoke">{message}</span>
      )}
    </div>
  );
}
