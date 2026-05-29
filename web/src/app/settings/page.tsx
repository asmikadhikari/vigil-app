import Link from "next/link";
import { ArrowLeft, CreditCard, Globe, Mail, MessageSquare, ShieldCheck, Webhook } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <main style={{ background: "var(--background)" }} className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground-light)] hover:bg-[var(--surface-100)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-tight md:text-5xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[var(--foreground-light)]">
          Manage billing, integrations, and notification preferences.
        </p>

        <div className="mt-10 space-y-8">

          {/* Billing Section */}
          <Section icon={CreditCard} title="Billing & Plan">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Current Plan</h3>
                  <p className="mt-1 text-xs text-[var(--foreground-lighter)]">
                    You are on the <strong className="text-[var(--brand)]">Pro</strong> plan
                    &middot; $49/month &middot; 10 competitors &middot; All sources
                  </p>
                </div>
                <form action="/api/stripe-portal" method="POST">
                  <button
                    type="submit"
                    className="inline-flex h-[38px] items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Manage subscription
                  </button>
                </form>
              </div>
              <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-3">
                {[
                  { tier: "Free", price: "$0", competitors: "2", sources: "Web only" },
                  { tier: "Pro", price: "$49/mo", competitors: "10", sources: "Web, Jobs, Reviews, Ads" },
                  { tier: "Business", price: "$149/mo", competitors: "25", sources: "All + Custom URLs" },
                ].map((plan) => (
                  <div
                    key={plan.tier}
                    className={`rounded-lg border p-4 ${
                      plan.tier === "Pro"
                        ? "border-[var(--brand)]/30 bg-[var(--brand)]/5"
                        : "border-[var(--border)] bg-[var(--surface-100)]"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-lighter)]">
                      {plan.tier}
                    </p>
                    <p className="mt-2 text-lg font-bold text-[var(--foreground)]">{plan.price}</p>
                    <p className="text-xs text-[var(--foreground-lighter)]">{plan.competitors} competitors</p>
                    <p className="text-xs text-[var(--foreground-lighter)]">{plan.sources}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Slack Integration */}
          <Section icon={MessageSquare} title="Slack Notifications">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Slack Webhook</h3>
                  <p className="mt-1 text-xs text-[var(--foreground-lighter)]">
                    Receive real-time intelligence alerts directly in your Slack workspace.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-100)] px-3 py-1.5 text-xs text-[var(--foreground-light)]">
                  <Webhook className="h-4 w-4" />
                  Not configured
                </span>
              </div>
              <form
                action="/api/slack-integration"
                method="POST"
                className="mt-4 flex flex-col gap-3 md:flex-row"
              >
                <input
                  type="url"
                  name="webhook_url"
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] outline-none focus:border-[var(--brand)]"
                />
                <button
                  type="submit"
                  className="inline-flex h-[38px] items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)]"
                >
                  Save webhook
                </button>
              </form>
            </div>
          </Section>

          {/* Email Notification Preferences */}
          <Section icon={Mail} title="Email Digest">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Weekly Intelligence Brief</h3>
                  <p className="mt-1 text-xs text-[var(--foreground-lighter)]">
                    Delivered every Monday morning with the latest competitive analysis.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Active
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--foreground-light)]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="accent-[var(--brand)]" />
                  Pricing alerts
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="accent-[var(--brand)]" />
                  Product changes
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="accent-[var(--brand)]" />
                  Hiring signals
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="accent-[var(--brand)]" />
                  Reputation shifts
                </label>
              </div>
            </div>
          </Section>

          {/* Scraper Sources */}
          <Section icon={Globe} title="Monitoring Sources">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { name: "Website Changes", status: "Active", desc: "Daily page diff monitoring via ZenRows proxy" },
                  { name: "Job Postings", status: "Active", desc: "Weekly SerpAPI Google Jobs scan" },
                  { name: "Reviews", status: "Active", desc: "G2, Trustpilot, Capterra, Reddit, Google" },
                  { name: "Ad Campaigns", status: "Active", desc: "Google, Meta, LinkedIn ad library monitoring" },
                ].map((source) => (
                  <div key={source.name} className="rounded-lg border border-[var(--border)] bg-[var(--surface-100)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{source.name}</p>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-400">
                        {source.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--foreground-lighter)]">{source.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

        </div>
      </div>
    </main>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--brand)]" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-light)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
