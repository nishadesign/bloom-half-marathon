"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdjustButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const adjust = async () => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/plan/adjust", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error ?? "unknown"}`);
        return;
      }
      setMessage(
        data.adjusted
          ? `Adjusted next week: ${data.reason}`
          : `No change: ${data.reason}`,
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "unknown error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-xs sm:gap-sm sm:items-center">
      <button onClick={adjust} disabled={pending} className="btn-primary">
        {pending ? "Reviewing…" : "Adjust next week"}
      </button>
      {message && (
        <span className="display-italic text-[14px] text-smoke">{message}</span>
      )}
    </div>
  );
}
