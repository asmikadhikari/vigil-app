import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  FileCode2,
  Globe2,
  ShieldAlert,
} from "lucide-react";
import {
  demoChanges,
  demoCompetitors,
  demoJobs,
  type Competitor,
  type JobPosting,
  type WebsiteChange,
} from "src/lib/demo-data";
import { formatDate, formatDateTime } from "src/lib/format";
import { createClient, hasSupabaseServerEnv } from "src/lib/supabase/server";
import { TrackedUrlForm } from "./tracked-url-form";

export const dynamic = "force-dynamic";

type CompetitorPageData = {
  competitor: Competitor;
  changes: WebsiteChange[];
  jobs: JobPosting[];
  sites: CompetitorSite[];
  mode: "live" | "demo" | "signed-out";
};

type CompetitorSite = {
  id: string;
  url: string;
  page_type: "homepage" | "pricing" | "product" | "careers" | "blog";
  last_checked_at: string | null;
};

async function getCompetitorData(id: string): Promise<CompetitorPageData> {
  const demoCompetitor = demoCompetitors.find((competitor) => competitor.id === id) ?? demoCompetitors[0];
  const demoPayload = {
    competitor: demoCompetitor,
    changes: demoChanges.filter((change) => change.competitor_id === demoCompetitor.id),
    jobs: demoJobs.filter((job) => job.competitor_id === demoCompetitor.id),
    sites: [
      {
        id: "demo-site-home",
        url: `https://${demoCompetitor.domain}`,
        page_type: "homepage" as const,
        last_checked_at: "2026-05-29T03:00:00.000Z",
      },
      {
        id: "demo-site-pricing",
        url: `https://${demoCompetitor.domain}/pricing`,
        page_type: "pricing" as const,
        last_checked_at: "2026-05-29T03:12:00.000Z",
      },
    ],
  };

  if (!hasSupabaseServerEnv()) {
    return { ...demoPayload, mode: "demo" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || id.startsWith("demo-")) {
    return { ...demoPayload, mode: user ? "demo" : "signed-out" };
  }

  const [competitorResult, changesResult, jobsResult, sitesResult] = await Promise.all([
    supabase
      .from("competitors")
      .select("id,name,domain,status,ai_confidence,created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("website_changes")
      .select("id,competitor_id,detected_at,change_summary,diff_text,severity")
      .eq("competitor_id", id)
      .order("detected_at", { ascending: false }),
    supabase
      .from("job_postings")
      .select("id,competitor_id,role,department,url,posted_at,detected_at,is_new")
      .eq("competitor_id", id)
      .order("detected_at", { ascending: false }),
    supabase
      .from("competitor_sites")
      .select("id,url,page_type,last_checked_at")
      .eq("competitor_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    competitor: (competitorResult.data ?? demoPayload.competitor) as Competitor,
    changes: (changesResult.data ?? []) as WebsiteChange[],
    jobs: (jobsResult.data ?? []) as JobPosting[],
    sites: (sitesResult.data ?? []) as CompetitorSite[],
    mode: "live",
  };
}

const severityColor = {
  high: "text-red-400 bg-red-500/10 border-red-500/30",
  medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  low: "text-[var(--foreground-light)] bg-[var(--surface-100)] border-[var(--border)]",
};

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { competitor, changes, jobs, sites, mode } = await getCompetitorData(id);

  return (
    <main style={{ background: "var(--background)" }} className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground-light)] hover:bg-[var(--surface-100)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {mode !== "live" && (
          <div className="mt-6 rounded-md border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 text-sm text-[var(--foreground-light)]">
            Viewing demo competitor data. Configure Supabase and sign in to load persisted targets.
          </div>
        )}

        <header className="mt-8 grid gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-6 md:grid-cols-[1fr_280px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Competitor profile
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
              {competitor.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-light)]">
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4" />
                {competitor.domain}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Added {formatDate(competitor.created_at)}
              </span>
            </div>
          </div>
          <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-lighter)]">Status</span>
              <span className="text-sm font-semibold capitalize text-[var(--brand)]">{competitor.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-lighter)]">
                AI confidence
              </span>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {Math.round((competitor.ai_confidence ?? 0) * 100)}%
              </span>
            </div>
            <a
              href={`https://${competitor.domain}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)]"
            >
              Open site
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Visual Diff Timeline</h2>
                <p className="text-xs text-[var(--foreground-lighter)]">
                  Semantic website changes captured by the scraper.
                </p>
              </div>
              <FileCode2 className="h-5 w-5 text-[var(--foreground-lighter)]" />
            </div>

            <div className="mt-5 space-y-4">
              {changes.length === 0 && (
                <EmptyState
                  icon={ShieldAlert}
                  title="No changes yet"
                  body="Once the scraper sees a hash delta, page diffs and summaries appear here."
                />
              )}
              {changes.map((change) => (
                <article
                  key={change.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-100)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${severityColor[change.severity]}`}
                    >
                      {change.severity}
                    </span>
                    <span className="text-xs text-[var(--foreground-lighter)]">{formatDateTime(change.detected_at)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--foreground-light)]">{change.change_summary}</p>
                  {change.diff_text && (
                    <pre className="mt-4 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface-75)] p-4 text-xs leading-6 text-[var(--foreground-light)]">
                      {change.diff_text}
                    </pre>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Hiring Signals</h2>
                <p className="text-xs text-[var(--foreground-lighter)]">Roles collected from search scans.</p>
              </div>
              <BriefcaseBusiness className="h-5 w-5 text-[var(--foreground-lighter)]" />
            </div>

            <div className="mt-5 space-y-3">
              {jobs.length === 0 && (
                <EmptyState
                  icon={BriefcaseBusiness}
                  title="No job signals"
                  body="Weekly job scan results will appear after the background worker runs."
                />
              )}
              {jobs.map((job) => (
                <div key={job.id} className="rounded-md border border-[var(--border)] bg-[var(--surface-100)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{job.role}</p>
                    {job.is_new && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase text-blue-400">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[var(--foreground-lighter)]">
                    {job.department} · Posted {formatDate(job.posted_at)}
                  </p>
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-400"
                    >
                      View role
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <TrackedUrlForm competitorId={competitor.id} disabled={mode !== "live"} />

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Tracked Page Inventory</h2>
                <p className="text-xs text-[var(--foreground-lighter)]">Pages queued for daily scraper checks.</p>
              </div>
              <Globe2 className="h-5 w-5 text-[var(--foreground-lighter)]" />
            </div>
            <div className="mt-5 overflow-hidden rounded-md border border-[var(--border)]">
              {sites.length === 0 && (
                <div className="p-4 text-sm text-[var(--foreground-lighter)]">No tracked URLs have been added yet.</div>
              )}
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="grid gap-2 border-b border-[var(--border)] bg-[var(--surface-100)] p-4 last:border-b-0 md:grid-cols-[1fr_120px_170px]"
                >
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    {site.url}
                  </a>
                  <span className="text-sm capitalize text-[var(--foreground-light)]">{site.page_type}</span>
                  <span className="text-sm text-[var(--foreground-lighter)]">{formatDateTime(site.last_checked_at)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldAlert;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--surface-75)] p-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-[var(--foreground-muted)]" />
      <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[var(--foreground-lighter)]">{body}</p>
    </div>
  );
}
