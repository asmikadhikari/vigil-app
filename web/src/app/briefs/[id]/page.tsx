import Link from "next/link";
import { ArrowLeft, Sparkles, CalendarClock, Mail, FileText } from "lucide-react";
import { demoBrief, type WeeklyBrief } from "src/lib/demo-data";
import { formatDate, formatDateTime } from "src/lib/format";
import { createClient, hasSupabaseServerEnv } from "src/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getBrief(id: string): Promise<{
  brief: WeeklyBrief;
  mode: "live" | "demo" | "signed-out";
}> {
  if (!hasSupabaseServerEnv()) {
    return { brief: demoBrief, mode: "demo" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || id.startsWith("demo-")) {
    return { brief: demoBrief, mode: user ? "demo" : "signed-out" };
  }

  const { data } = await supabase
    .from("weekly_briefs")
    .select("id,week_start,bullets,swot_analysis,generated_at,is_sent")
    .eq("id", id)
    .single();

  return { brief: (data ?? demoBrief) as WeeklyBrief, mode: "live" };
}

const quadrantColor = {
  strengths: "var(--brand)",
  weaknesses: "var(--danger)",
  opportunities: "#3b82f6",
  threats: "#f59e0b",
};

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { brief, mode } = await getBrief(id);
  const bullets = Array.isArray(brief.bullets) ? brief.bullets : [];

  return (
    <main style={{ background: "var(--background)" }} className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground-light)] hover:bg-[var(--surface-100)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {mode !== "live" && (
          <div className="mt-6 rounded-md border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 text-sm text-[var(--foreground-light)]">
            Viewing demo brief. Configure Supabase and sign in to load persisted data.
          </div>
        )}

        <header className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Weekly Intelligence Brief
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Week of {formatDate(brief.week_start)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-light)]">
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Generated {formatDateTime(brief.generated_at)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {brief.is_sent ? "Delivered" : "Awaiting delivery"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-[var(--brand)]/5 px-4 py-2 text-xs font-semibold text-[var(--brand)]">
              <Sparkles className="h-4 w-4" />
              AI-Generated
            </span>
          </div>
        </header>

        <div className="mt-10 card-border">
          <div className="bg-[var(--surface-75)] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[var(--brand)]" />
              <h2 className="text-lg font-bold text-[var(--foreground)]">Executive Summary</h2>
            </div>
            <div className="mt-6 space-y-4">
              {bullets.map((bullet, index) => (
                <div
                  key={typeof bullet === "string" ? bullet : bullet.title ?? index}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-100)] p-5 text-sm leading-7 text-[var(--foreground-light)]"
                >
                  {typeof bullet === "string" ? bullet : bullet.body ?? bullet.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-[var(--foreground)]">SWOT Analysis Canvas</h2>
          <p className="mt-1 text-sm text-[var(--foreground-lighter)]">
            AI-compiled strategic assessment across four dimensions.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(
              [
                "strengths",
                "weaknesses",
                "opportunities",
                "threats",
              ] as const
            ).map((key) => {
              const items = brief.swot_analysis[key] ?? [];
              return (
                <div
                  key={key}
                  className="card-border"
                >
                  <div className="bg-[var(--surface-75)] p-5 md:p-6">
                    <h3 className="flex items-center gap-2 text-base font-bold capitalize text-[var(--foreground)]">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${quadrantColor[key]} 15%, transparent)`,
                          color: quadrantColor[key],
                        }}
                      >
                        {key === "strengths" ? "S" : key === "weaknesses" ? "W" : key === "opportunities" ? "O" : "T"}
                      </span>
                      {key}
                    </h3>
                    <ul className="mt-4 space-y-3">
                      {items.length === 0 && (
                        <li className="text-sm italic text-[var(--foreground-lighter)]">
                          No data available for this quadrant.
                        </li>
                      )}
                      {items.map((item, index) => (
                        <li
                          key={item + index}
                          className="flex items-start gap-3 text-sm leading-6 text-[var(--foreground-light)]"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: quadrantColor[key] }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-10 rounded-md border border-[var(--border)] bg-[var(--surface-75)] p-6 text-center text-xs text-[var(--foreground-lighter)]">
          Generated by Vigil AI analysis pipeline ·{" "}
          {formatDateTime(brief.generated_at)}
        </div>
      </div>
    </main>
  );
}
