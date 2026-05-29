import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Eye,
  FileText,
  Globe2,
  Plus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  demoAlerts,
  demoBrief,
  demoChanges,
  demoCompetitors,
  demoJobs,
  type Alert,
  type Competitor,
  type JobPosting,
  type WebsiteChange,
  type WeeklyBrief,
} from "src/lib/demo-data";
import { formatDate, formatDateTime } from "src/lib/format";
import { createClient, hasSupabaseServerEnv } from "src/lib/supabase/server";
import { CompetitorStatusButton, MarkAlertReadButton } from "./dashboard-actions";
import { RealtimeProvider } from "src/components/realtime-provider";

export const dynamic = "force-dynamic";

type DashboardData = {
  competitors: Competitor[];
  alerts: Alert[];
  changes: WebsiteChange[];
  jobs: JobPosting[];
  brief: WeeklyBrief;
  mode: "live" | "demo" | "signed-out";
};

async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseServerEnv()) {
    return {
      competitors: demoCompetitors,
      alerts: demoAlerts,
      changes: demoChanges,
      jobs: demoJobs,
      brief: demoBrief,
      mode: "demo",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      competitors: demoCompetitors,
      alerts: demoAlerts,
      changes: demoChanges,
      jobs: demoJobs,
      brief: demoBrief,
      mode: "signed-out",
    };
  }

  const [competitorsResult, alertsResult, changesResult, jobsResult, briefsResult] =
    await Promise.all([
      supabase
        .from("competitors")
        .select("id,name,domain,status,ai_confidence,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("alerts")
        .select("id,competitor_id,severity,category,title,body,is_read,created_at,competitors(name,domain)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("website_changes")
        .select("id,competitor_id,detected_at,change_summary,diff_text,severity,competitors(name,domain)")
        .order("detected_at", { ascending: false })
        .limit(6),
      supabase
        .from("job_postings")
        .select("id,competitor_id,role,department,url,posted_at,detected_at,is_new")
        .order("detected_at", { ascending: false })
        .limit(8),
      supabase
        .from("weekly_briefs")
        .select("id,week_start,bullets,swot_analysis,generated_at,is_sent")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    competitors: (competitorsResult.data ?? demoCompetitors) as Competitor[],
    alerts: (alertsResult.data ?? demoAlerts) as Alert[],
    changes: (changesResult.data ?? demoChanges) as WebsiteChange[],
    jobs: (jobsResult.data ?? demoJobs) as JobPosting[],
    brief: (briefsResult.data ?? demoBrief) as WeeklyBrief,
    mode: "live",
  };
}

const severityStyles = {
  critical: "border-red-500/30 bg-red-500/10 text-red-400",
  high: "border-red-500/30 bg-red-500/10 text-red-400",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  low: "border-[var(--border)] bg-[var(--surface-100)] text-[var(--foreground-light)]",
};

function countUnread(alerts: Alert[]) {
  return alerts.filter((alert) => !alert.is_read).length;
}

function departmentBars(jobs: JobPosting[]) {
  const counts = jobs.reduce<Record<string, number>>((acc, job) => {
    acc[job.department] = (acc[job.department] ?? 0) + 1;
    return acc;
  }, {});

  const total = Math.max(jobs.length, 1);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([department, count]) => ({
      department,
      count,
      percent: Math.round((count / total) * 100),
    }));
}

export default async function DashboardPage() {
  const { competitors, alerts, changes, jobs, brief, mode } = await getDashboardData();
  const bars = departmentBars(jobs);
  const trackingCount = competitors.filter((competitor) => competitor.status === "tracking").length;
  const latestChange = changes[0];
  const bullets = Array.isArray(brief.bullets) ? brief.bullets.slice(0, 3) : [];

  return (
    <RealtimeProvider>
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <nav className="sticky top-0 z-50 h-16 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xs">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)]">
              <Eye className="h-4 w-4 text-[var(--background)]" />
            </div>
            <span className="font-bold tracking-tight text-[var(--foreground)]">Vigil</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-xs font-semibold text-[var(--foreground-light)] hover:bg-[var(--surface-100)]"
            >
              Settings
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-xs font-semibold text-[var(--foreground-light)] hover:bg-[var(--surface-100)]"
            >
              <Plus className="h-4 w-4" />
              Add competitor
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)]"
            >
              Account
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-2">
            {[
              ["Overview", Activity],
              ["Alerts", Bell],
              ["Competitors", Building2],
              ["Briefs", FileText],
            ].map(([label, Icon]) => (
              <a
                key={label as string}
                href={`#${String(label).toLowerCase()}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--foreground-light)] hover:bg-[var(--surface-100)] hover:text-[var(--foreground)]"
              >
                <Icon className="h-4 w-4" />
                {label as string}
              </a>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">
          {mode !== "live" && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4 text-sm text-[var(--foreground-light)]">
              {mode === "signed-out"
                ? "Showing demo intelligence because no active Supabase session was found."
                : "Showing demo intelligence until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured."}
            </div>
          )}

          <div id="overview" className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Competitive command center
            </p>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
                  Intelligence Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-light)]">
                  Live Supabase-backed monitoring for competitor changes, hiring signals, alerts,
                  and weekly strategy briefs.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-[var(--surface-75)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground-light)] md:self-auto">
                <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
                RLS protected
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={Building2} label="Tracked competitors" value={trackingCount.toString()} />
            <Metric icon={Bell} label="Unread alerts" value={countUnread(alerts).toString()} />
            <Metric icon={TrendingUp} label="Website changes" value={changes.length.toString()} />
            <Metric icon={BriefcaseBusiness} label="Hiring signals" value={jobs.length.toString()} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section
              id="alerts"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Priority Alerts</h2>
                  <p className="text-xs text-[var(--foreground-lighter)]">Ranked by severity and newest signal.</p>
                </div>
                <Bell className="h-5 w-5 text-[var(--foreground-muted)]" />
              </div>
              <div className="mt-5 space-y-3">
                {alerts.map((alert) => (
                  <article
                    key={alert.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-4 transition hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/competitors/${alert.competitor_id}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${severityStyles[alert.severity]}`}
                          >
                            {alert.severity}
                          </span>
                          <span className="text-xs text-[var(--foreground-lighter)]">
                            {alert.competitors?.name ?? "Competitor"} · {formatDateTime(alert.created_at)}
                          </span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">{alert.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--foreground-light)]">{alert.body}</p>
                      </Link>
                      <MarkAlertReadButton
                        alertId={alert.id}
                        isRead={alert.is_read}
                        disabled={mode !== "live"}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Weekly Brief</h2>
                  <p className="text-xs text-[var(--foreground-lighter)]">Week of {formatDate(brief.week_start)}</p>
                </div>
                <FileText className="h-5 w-5 text-[var(--brand)]" />
              </div>
              <div className="mt-5 space-y-3">
                {bullets.map((bullet, index) => (
                  <div
                    key={typeof bullet === "string" ? bullet : bullet.title ?? index}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-4 text-sm leading-6 text-[var(--foreground)]"
                  >
                    {typeof bullet === "string" ? bullet : bullet.body ?? bullet.title}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href={`/briefs/${brief.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/10 px-4 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/20"
                >
                  <FileText className="h-4 w-4" />
                  View full brief & SWOT canvas
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                {(["strengths", "weaknesses", "opportunities", "threats"] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-3">
                    <p className="font-bold capitalize text-[var(--foreground)]">{key}</p>
                    <p className="mt-2 leading-5 text-[var(--foreground-lighter)]">
                      {(brief.swot_analysis[key] ?? ["Awaiting analysis"])[0]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Recent Website Changes</h2>
                  <p className="text-xs text-[var(--foreground-lighter)]">
                    Latest: {latestChange ? formatDateTime(latestChange.detected_at) : "none"}
                  </p>
                </div>
                <Globe2 className="h-5 w-5 text-[var(--foreground-muted)]" />
              </div>
              <div className="mt-5 space-y-3">
                {changes.map((change) => (
                  <Link
                    href={`/competitors/${change.competitor_id}`}
                    key={change.id}
                    className="block rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-4 hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {change.competitors?.name ?? "Competitor"}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${severityStyles[change.severity]}`}
                      >
                        {change.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground-light)]">{change.change_summary}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Hiring Distribution</h2>
                  <p className="text-xs text-[var(--foreground-lighter)]">Department mix from job scans.</p>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-[var(--foreground-muted)]" />
              </div>
              <div className="mt-5 space-y-4">
                {bars.map((bar) => (
                  <div key={bar.department}>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--foreground)]">{bar.department}</span>
                      <span className="text-[var(--foreground-lighter)]">
                        {bar.count} roles · {bar.percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-300)]">
                      <div
                        className="h-full rounded-full bg-[var(--brand)]"
                        style={{ width: `${bar.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                {jobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{job.role}</p>
                      <p className="text-xs text-[var(--foreground-lighter)]">{job.department}</p>
                    </div>
                    {job.is_new && (
                      <span className="rounded-full bg-[var(--brand)]/10 px-2 py-1 text-[10px] font-bold uppercase text-[var(--brand)]">
                        New
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section id="competitors" className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Competitors</h2>
                <p className="text-xs text-[var(--foreground-lighter)]">Tracked targets and AI discovery confidence.</p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)]"
              >
                <Plus className="h-4 w-4" />
                Add
              </Link>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-[var(--border)]">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-75)] p-4 transition last:border-b-0 hover:bg-[var(--surface-100)] md:grid-cols-[1fr_140px_120px_110px_32px] md:items-center"
                >
                  <Link href={`/competitors/${competitor.id}`} className="min-w-0">
                    <p className="font-semibold text-[var(--foreground)]">{competitor.name}</p>
                    <p className="text-sm text-[var(--foreground-lighter)]">{competitor.domain}</p>
                  </Link>
                  <span className="text-sm capitalize text-[var(--foreground-light)]">{competitor.status}</span>
                  <span className="text-sm text-[var(--foreground-lighter)]">
                    {Math.round((competitor.ai_confidence ?? 0) * 100)}% confidence
                  </span>
                  <CompetitorStatusButton
                    competitorId={competitor.id}
                    status={competitor.status}
                    disabled={mode !== "live"}
                  />
                  <Link href={`/competitors/${competitor.id}`} aria-label={`Open ${competitor.name}`}>
                    <ArrowUpRight className="h-4 w-4 text-[var(--foreground-muted)]" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
    </RealtimeProvider>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-lighter)]">{label}</p>
        <Icon className="h-4 w-4 text-[var(--foreground-muted)]" />
      </div>
      <p className="mt-4 text-3xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
