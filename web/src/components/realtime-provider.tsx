"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Globe2, X } from "lucide-react";
import { createClient, hasSupabaseBrowserEnv } from "src/lib/supabase/browser";

type Notification = {
  id: string;
  type: "alert" | "change";
  title: string;
  severity?: string;
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasSupabaseBrowserEnv()) return;

    const supabase = createClient();

    const alertChannel = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          const record = payload.new as {
            id: string;
            title: string;
            severity: string;
          };
          const newAlert: Notification = {
              id: `alert-${record.id}`,
              type: "alert",
              title: record.title ?? "New intelligence alert",
              severity: record.severity,
            };
          setNotifications((prev) => [newAlert, ...prev].slice(0, 50));
          router.refresh();
        },
      )
      .subscribe();

    const changesChannel = supabase
      .channel("realtime-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "website_changes",
        },
        (payload) => {
          const record = payload.new as {
            id: string;
            change_summary: string;
            severity: string;
          };
          const newChange: Notification = {
              id: `change-${record.id}`,
              type: "change",
              title: record.change_summary ?? "Website change detected",
              severity: record.severity,
            };
          setNotifications((prev) => [newChange, ...prev].slice(0, 50));
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(changesChannel);
    };
  }, [router]);

  const activeNotifications = notifications.filter(
    (n) => !dismissed.has(n.id),
  );

  return (
    <>
      {activeNotifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {activeNotifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md ${
                notification.type === "alert"
                  ? "border-[var(--brand)]/30 bg-[var(--surface-75)]"
                  : "border-[var(--brand)]/30 bg-[var(--surface-75)]"
              }`}
            >
              <div className="shrink-0">
                {notification.type === "alert" ? (
                  <Bell className="h-5 w-5 text-[var(--brand)]" />
                ) : (
                  <Globe2 className="h-5 w-5 text-[var(--brand)]" />
                )}
              </div>
              <div className="min-w-0 max-w-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {notification.type === "alert"
                    ? "New Alert"
                    : "Website Change"}
                </p>
                <p className="mt-1 text-sm text-neutral-200">
                  {notification.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDismissed((prev) => new Set(prev).add(notification.id))
                }
                className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {children}
    </>
  );
}
