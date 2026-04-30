"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoneButton({
  day,
  alreadyDone,
}: {
  day: string;
  alreadyDone: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(alreadyDone);
  const [error, setError] = useState<string | null>(null);

  const mark = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "unknown error");
        return;
      }
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <span className="display-italic text-[13px] text-sand-deep">✓ Done</span>
    );
  }

  return (
    <div className="flex items-center gap-xs">
      <button
        type="button"
        onClick={mark}
        disabled={pending}
        className="btn-ghost"
      >
        {pending ? "Saving…" : "Mark done"}
      </button>
      {error && (
        <span className="display-italic text-[12px] text-smoke">{error}</span>
      )}
    </div>
  );
}
