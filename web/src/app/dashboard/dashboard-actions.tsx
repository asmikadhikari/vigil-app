"use client";

import { Check, Loader2, Pause, Play } from "lucide-react";
import { useState, useTransition } from "react";
import { markAlertRead, setCompetitorStatus } from "src/app/actions";

export function MarkAlertReadButton({
  alertId,
  isRead,
  disabled,
}: {
  alertId: string;
  isRead: boolean;
  disabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (isRead) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2 py-1 text-[10px] font-bold uppercase text-neutral-500">
        <Check className="h-3 w-3" />
        Read
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await markAlertRead(alertId);
            setMessage(result.message);
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2 py-1 text-[10px] font-bold uppercase text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Mark read
      </button>
      {message && <span className="max-w-36 text-right text-[10px] text-neutral-500">{message}</span>}
    </div>
  );
}

export function CompetitorStatusButton({
  competitorId,
  status,
  disabled,
}: {
  competitorId: string;
  status: "tracking" | "paused" | "discovered";
  disabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const nextStatus = status === "tracking" ? "paused" : "tracking";
  const Icon = status === "tracking" ? Pause : Play;

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        disabled={disabled || isPending || status === "discovered"}
        onClick={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await setCompetitorStatus(competitorId, nextStatus);
            setMessage(result.message);
          });
        }}
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-neutral-800 px-2 py-1 text-[10px] font-bold uppercase text-neutral-300 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
        {status === "tracking" ? "Pause" : "Resume"}
      </button>
      {message && <span className="max-w-36 text-[10px] text-neutral-500 md:text-right">{message}</span>}
    </div>
  );
}
