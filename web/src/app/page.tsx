"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Database,
  Eye,
  Globe,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { RadarSweep } from "src/components/radar-sweep";

const PRODUCTS = [
  {
    icon: Globe,
    title: "Website Monitor",
    desc: "Detects pricing, product, and marketing page changes within hours. ZenRows proxy bypasses Cloudflare automatically.",
  },
  {
    icon: Search,
    title: "Job Scanner",
    desc: "SerpAPI-powered hiring signal detection across LinkedIn, Indeed, and Google Jobs. Classifies roles by department.",
  },
  {
    icon: MessageSquare,
    title: "Review Tracker",
    desc: "Monitors G2, Trustpilot, Capterra, Reddit, and Google Reviews. Sentiment analysis on every mention.",
  },
  {
    icon: Layers,
    title: "Ad Intelligence",
    desc: "Tracks Google, Meta, and LinkedIn ad campaigns. Captures headlines, copy, CTAs, and landing pages.",
  },
  {
    icon: Database,
    title: "AI Pipeline",
    desc: "GPT-4o-mini Map-Reduce analysis. Daily per-competitor summaries compiled into weekly executive briefs.",
  },
  {
    icon: Lock,
    title: "SWOT Generator",
    desc: "Automated weekly SWOT analysis from aggregated signals. Strengths, weaknesses, opportunities, threats.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Head of Product, Acme Corp",
    text: "We caught our competitor's pricing restructure 3 hours after it went live. Our sales team adjusted positioning before their next demo call.",
  },
  {
    name: "Marcus Rivera",
    role: "GTM Ops, TechFlow",
    text: "The hiring signals told us NovaOps was building an AI agent platform before they announced it. We accelerated our roadmap by 2 months.",
  },
  {
    name: "Priya Sharma",
    role: "Founder, DataPulse",
    text: "No more Monday morning panic of missing a competitor launch. The weekly brief is the first thing I read every week.",
  },
];

const FAQ = [
  {
    q: "How does Vigil bypass Cloudflare?",
    a: "Every crawl routes through ZenRows rotating residential proxies with browser fingerprint spoofing. No login bypass, no cookie theft. Just clean, legal access to public pages using distinct IP addresses per request.",
  },
  {
    q: "Is scraping competitor pricing legal?",
    a: "Yes. The hiQ v. LinkedIn ruling confirmed that harvesting publicly available information from the open web is legal. Vigil never accesses password-protected pages or violates terms of service.",
  },
  {
    q: "How does the AI pipeline avoid false positives?",
    a: "Our DOM normalizer strips cookies, chatbots, timestamps, and layout noise before hashing. Only structural content changes trigger analysis. The Map step classifies each change by category and severity before it reaches your inbox.",
  },
  {
    q: "What does the weekly brief actually contain?",
    a: "3-5 executive bullets with specific competitor names, what changed, why it matters to your company, and a suggested counter-move. Plus a SWOT matrix built from 7 days of aggregated signals across all tracked competitors.",
  },
];

function FAQItem({ item }: { item: (typeof FAQ)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm text-[var(--foreground)]">{item.q}</span>
        <ChevronDown
          className={`ml-4 h-4 w-4 shrink-0 text-[var(--foreground-lighter)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-[var(--foreground-light)]">
          {item.a}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "brief" | "diff" | "hiring" | "swot"
  >("brief");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
      {/* ── NAV ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[var(--brand)]" />
              <span className="text-base font-medium text-[var(--foreground)]">
                Vigil
              </span>
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <a
                href="#products"
                className="text-sm text-[var(--foreground-light)] transition-colors hover:text-[var(--foreground)]"
              >
                Products
              </a>
              <a
                href="#demo"
                className="text-sm text-[var(--foreground-light)] transition-colors hover:text-[var(--foreground)]"
              >
                Demo
              </a>
              <a
                href="#pricing"
                className="text-sm text-[var(--foreground-light)] transition-colors hover:text-[var(--foreground)]"
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="text-sm text-[var(--foreground-light)] transition-colors hover:text-[var(--foreground)]"
              >
                FAQ
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-[var(--foreground-light)] transition-colors hover:text-[var(--foreground)] md:block"
            >
              Sign in
            </Link>
            <Link
              href="/login?signup=true"
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-[var(--brand-hover)]"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Radial gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 bg-[radial-gradient(50%_100%_at_50%_0,rgba(62,207,142,0.08)_0%,transparent_60%)]" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-16 lg:py-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left: Text */}
            <div className="max-w-xl">
              {/* Announcement pill */}
              <a
                href="#products"
                className="group/ann inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-75)] px-1 pr-1.5 text-sm text-[var(--foreground-light)] transition-colors hover:border-[var(--foreground-muted)]/30"
              >
                <span className="relative overflow-hidden rounded-full bg-[var(--surface-200)] px-3 py-1 backdrop-blur-md">
                  <span className="absolute inset-0 bg-gradient-to-br from-[var(--surface-100)] to-[var(--surface-300)] opacity-70 group-hover/ann:opacity-100 transition-opacity" />
                  <span className="relative">
                    <Zap className="mr-1 inline h-3 w-3 text-[var(--brand)]" />
                    v1.0
                  </span>
                </span>
                <span>Introducing Vigil</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover/ann:translate-x-0.5" />
              </a>

              {/* Two-tone headline */}
              <h1 className="mt-8 text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block text-[var(--foreground)]">
                  Your competitors changed
                </span>
                <span className="block text-[var(--foreground)]">
                  their pricing at{" "}
                  <span className="text-[var(--brand)]">3am.</span>
                </span>
                <span className="mt-2 block text-2xl font-normal text-[var(--foreground-light)] sm:text-3xl lg:text-4xl">
                  You found out at lunch.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--foreground-light)]">
                Vigil watches your competitors&apos; websites, job boards,
                reviews, and ads. When something changes, you get an alert and a
                suggested counter-move.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login?signup=true"
                  className="inline-flex h-[38px] items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-[var(--brand-hover)]"
                >
                  Start free sandbox
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#demo"
                  className="inline-flex h-[38px] items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-4 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--border-strong)]"
                >
                  See the output
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-xs text-[var(--foreground-lighter)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-[var(--brand)]" />
                  2 competitors free
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[var(--brand)]" />
                  Weekly brief
                </span>
              </div>
            </div>

            {/* Right: Radar */}
            <div className="hidden lg:block">
              <RadarSweep />
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGO MARQUEE ─────────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-[var(--surface-75)]">
        <div className="relative overflow-hidden py-6 opacity-70 dark:opacity-50">
          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--surface-75)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--surface-75)] to-transparent" />

          <div className="flex w-max gap-16 animate-[marquee_60s_linear_infinite]">
            {[...Array(2)].map((_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-16">
                {["Acme Corp", "NovaOps", "PulseStack", "FluxData", "CoreAI", "DataPulse", "TechFlow", "Synthwave"].map(
                  (name) => (
                    <span
                      key={`${setIdx}-${name}`}
                      className="whitespace-nowrap text-sm font-medium text-[var(--foreground-muted)]"
                    >
                      {name}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ─────────────────────────────────── */}
      <section id="products" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              Products
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
              Everything you need to
              <br />
              <span className="text-[var(--foreground-light)]">
                stay ahead of the competition
              </span>
            </h2>
            <p className="mt-4 text-base text-[var(--foreground-light)]">
              Six integrated monitoring surfaces. One AI pipeline. Zero manual
              configuration.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((product) => (
              <div key={product.title} className="group">
                <div className="card-border transition-all duration-200 group-hover:shadow-md">
                  <div className="flex h-full flex-col bg-[var(--surface-75)] p-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-200)]">
                      <product.icon className="h-5 w-5 text-[var(--brand)]" />
                    </div>
                    <h3 className="text-base font-medium text-[var(--foreground)]">
                      {product.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-light)]">
                      {product.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────── */}
      <section
        id="demo"
        className="border-y border-[var(--border)] bg-[var(--surface-75)] py-24 lg:py-32"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              Dashboard
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Intelligence at a glance
            </h2>
          </div>

          <div className="mt-12">
            {/* Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] p-1">
                {(["brief", "diff", "hiring", "swot"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-sm transition-all duration-200 ${
                      activeTab === tab
                        ? "border border-[var(--foreground-muted)] bg-[var(--surface-200)] text-[var(--foreground)]"
                        : "text-[var(--foreground-lighter)] hover:text-[var(--foreground-light)]"
                    }`}
                  >
                    {tab === "brief"
                      ? "Weekly brief"
                      : tab === "diff"
                        ? "Price diff"
                        : tab === "hiring"
                          ? "Hiring"
                          : "SWOT"}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-xs text-[var(--foreground-muted)]">
                  app.vigil.ai/competitors/acme-corp
                </span>
              </div>

              <div className="min-h-[340px] p-6 md:p-8">
                {/* Brief */}
                {activeTab === "brief" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-[var(--foreground)]">
                          Acme Corp
                        </h3>
                        <p className="font-mono text-xs text-[var(--foreground-muted)]">
                          Week of May 22 – May 29
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        1 critical
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-400">
                            Pricing
                          </span>
                          <span className="font-mono text-[10px] text-[var(--foreground-muted)]">
                            Acme Corp
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground)]">
                          Cut Starter tier from $29 to $21/mo. Added native
                          webhooks to base plan.
                        </p>
                        <p className="mt-2 text-xs text-[var(--foreground-light)]">
                          <span className="font-medium text-[var(--foreground)]">
                            Action:
                          </span>{" "}
                          Lead with API integration depth in sales decks.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-400">
                            Hiring
                          </span>
                          <span className="font-mono text-[10px] text-[var(--foreground-muted)]">
                            Acme Corp
                          </span>
                        </div>
                        <p className="text-sm text-[var(--foreground)]">
                          3 senior engineering roles targeting &quot;AI
                          Agents&quot; and &quot;workflow automation&quot;.
                        </p>
                        <p className="mt-2 text-xs text-[var(--foreground-light)]">
                          <span className="font-medium text-[var(--foreground)]">
                            Action:
                          </span>{" "}
                          Signals Q3 feature launch. Prep competitive positioning.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Diff */}
                {activeTab === "diff" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        Semantic content diff
                      </h3>
                      <p className="font-mono text-xs text-[var(--foreground-muted)]">
                        acme.com/pricing · noise-filtered
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] font-mono text-xs leading-6">
                      <div className="border-b border-[var(--border)] px-4 py-2 text-[var(--foreground-muted)]">
                        @@ -14,8 +14,8 @@ Tier definitions
                      </div>
                      <div className="border-b border-[var(--border)] bg-red-500/5 px-4 py-1 text-red-400">
                        - &lt;span class=&quot;price&quot;&gt;$29/mo&lt;/span&gt;
                      </div>
                      <div className="border-b border-[var(--border)] bg-[var(--brand)]/5 px-4 py-1 text-[var(--brand)]">
                        + &lt;span class=&quot;price&quot;&gt;$21/mo&lt;/span&gt;
                      </div>
                      <div className="border-b border-[var(--border)] px-4 py-1 text-[var(--foreground-muted)]">
                        &nbsp;&nbsp;&lt;li&gt;5 Active Projects&lt;/li&gt;
                      </div>
                      <div className="bg-[var(--brand)]/5 px-4 py-1 text-[var(--brand)]">
                        + &lt;li&gt;Native Webhook Dispatcher&lt;/li&gt;
                      </div>
                    </div>
                  </div>
                )}

                {/* Hiring */}
                {activeTab === "hiring" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        Hiring signal analysis
                      </h3>
                      <p className="font-mono text-xs text-[var(--foreground-muted)]">
                        SerpAPI index · updated 6h ago
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                          Active openings
                        </p>
                        <p className="mt-2 text-4xl font-medium text-[var(--foreground)]">
                          12
                        </p>
                        <p className="mt-1 text-xs text-[var(--brand)]">
                          +4 this week
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                          By department
                        </p>
                        <div className="space-y-3">
                          {[
                            { dept: "Engineering", count: 7, pct: 58 },
                            { dept: "Sales", count: 3, pct: 25 },
                            { dept: "Marketing", count: 2, pct: 17 },
                          ].map((d) => (
                            <div key={d.dept}>
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-[var(--foreground-light)]">
                                  {d.dept}
                                </span>
                                <span className="text-[var(--foreground-muted)]">
                                  {d.count} · {d.pct}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-300)]">
                                <div
                                  className="h-full rounded-full bg-[var(--brand)]"
                                  style={{ width: `${d.pct}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SWOT */}
                {activeTab === "swot" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        SWOT positioning
                      </h3>
                      <p className="font-mono text-xs text-[var(--foreground-muted)]">
                        Generated from 7-day signal aggregation
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Strengths
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground-light)]">
                          Native SOC2 compliance and enterprise database support
                          that Acme lacks entirely.
                        </p>
                      </div>
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-red-400">
                          Weaknesses
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground-light)]">
                          Entry tier at $49 is 2.3x Acme&apos;s new $21 price
                          point.
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                          Opportunities
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground-light)]">
                          Acme&apos;s webhook bundling signals commoditization.
                          Differentiate on reliability.
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
                          Threats
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground-light)]">
                          3 AI agent hires suggest Q3 automation shipping. 60-90
                          day response window.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              From our users
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Trusted by product teams
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-75)] p-6 transition-colors hover:border-[var(--foreground-muted)]"
              >
                <p className="text-sm leading-relaxed text-[var(--foreground-light)]">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-300)] text-xs font-medium text-[var(--foreground-light)]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-[var(--surface-75)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              Process
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Three layers. One brief.
            </h2>
          </div>
          <div className="mt-16 grid gap-px bg-[var(--border)] sm:grid-cols-3">
            {[
              {
                num: "01",
                title: "Scrape",
                desc: "ZenRows proxy grid rotates residential IPs per request. DOM normalizer strips noise. MD5 hash detects structural changes.",
              },
              {
                num: "02",
                title: "Analyze",
                desc: "GPT-4o-mini Map step classifies each change by category, severity, and strategic impact. Pricing extractions are schema-validated.",
              },
              {
                num: "03",
                title: "Deliver",
                desc: "Sunday Reduce step compiles 7 days into 3-5 executive bullets and a SWOT matrix. Real-time alerts fire for high-severity changes.",
              },
            ].map((step) => (
              <div key={step.num} className="bg-[var(--surface-75)] p-8">
                <span className="font-mono text-3xl font-medium text-[var(--brand)]">
                  {step.num}
                </span>
                <h3 className="mt-4 text-lg font-medium text-[var(--foreground)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-light)]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────── */}
      <section id="pricing" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              Pricing
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Pay for intelligence, not headcount.
            </h2>
          </div>
          <div className="mt-16 grid gap-px bg-[var(--border)] sm:grid-cols-3">
            {/* Free */}
            <div className="bg-[var(--surface-75)] p-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                Free
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-medium text-[var(--foreground)]">
                  $0
                </span>
                <span className="text-sm text-[var(--foreground-muted)]">
                  forever
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--foreground-light)]">
                2 competitors. Webpage tracking. Weekly email.
              </p>
              <Link
                href="/login?signup=true"
                className="mt-6 block rounded-md border border-[var(--border)] bg-[var(--surface-75)] py-2 text-center text-sm transition-all duration-200 hover:border-[var(--border-strong)]"
              >
                Start free
              </Link>
            </div>
            {/* Pro */}
            <div className="bg-[var(--surface-75)] p-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Pro
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-medium text-[var(--foreground)]">
                  $49
                </span>
                <span className="text-sm text-[var(--foreground-muted)]">
                  /mo
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--foreground-light)]">
                10 competitors. Web, jobs, reviews, ads. Slack + email. Full
                SWOT.
              </p>
              <Link
                href="/login?signup=true"
                className="mt-6 block rounded-md bg-[var(--brand)] py-2 text-center text-sm font-medium text-black transition-all duration-200 hover:bg-[var(--brand-hover)]"
              >
                Start Pro trial
              </Link>
            </div>
            {/* Business */}
            <div className="bg-[var(--surface-75)] p-8">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                Business
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-medium text-[var(--foreground)]">
                  $149
                </span>
                <span className="text-sm text-[var(--foreground-muted)]">
                  /mo
                </span>
              </div>
              <p className="mt-3 text-sm text-[var(--foreground-light)]">
                25 competitors. All sources + custom URLs. API. Multi-seat.
              </p>
              <Link
                href="/login?signup=true"
                className="mt-6 block rounded-md border border-[var(--border)] bg-[var(--surface-75)] py-2 text-center text-sm transition-all duration-200 hover:border-[var(--border-strong)]"
              >
                Start Business trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section
        id="faq"
        className="border-y border-[var(--border)] bg-[var(--surface-75)] py-24 lg:py-32"
      >
        <div className="mx-auto max-w-3xl px-6 lg:px-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--brand)]">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Questions, answered.
            </h2>
          </div>
          <div className="mt-12">
            {FAQ.map((item) => (
              <FAQItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-16">
          <h2 className="text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
            Stop finding out late.
          </h2>
          <p className="mt-3 max-w-md text-base text-[var(--foreground-light)]">
            Free sandbox. 2 competitors. No credit card. Set up in under 3
            minutes.
          </p>
          <Link
            href="/login?signup=true"
            className="mt-6 inline-flex h-[38px] items-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-[var(--brand-hover)]"
          >
            Start free sandbox
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-75)]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-16 lg:py-24">
          {/* Security bar */}
          <div className="flex flex-col items-start justify-between gap-8 border-b border-[var(--border)] pb-8 md:flex-row md:items-center">
            <p className="text-sm text-[var(--foreground-light)]">
              We protect your data.{" "}
              <a
                href="#"
                className="text-[var(--foreground)] underline underline-offset-4 hover:text-[var(--brand)]"
              >
                Learn more
              </a>
            </p>
            <div className="flex items-center gap-6 text-xs text-[var(--foreground-lighter)]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
                SOC2 Type 2
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[var(--brand)]" />
                Encrypted at rest
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[var(--brand)]" />
                GDPR compliant
              </span>
            </div>
          </div>

          {/* Main footer */}
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[var(--brand)]" />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Vigil
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-[var(--foreground-lighter)]">
                AI-native competitive intelligence for SMBs. Watch your
                competitors so you don&apos;t have to.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  "Website Monitor",
                  "Job Scanner",
                  "Review Tracker",
                  "Ad Intelligence",
                ],
              },
              {
                title: "Resources",
                links: ["Documentation", "API Reference", "Changelog", "Status"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h6 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                  {col.title}
                </h6>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-[var(--foreground-lighter)] transition-colors hover:text-[var(--foreground)]"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-[var(--border)] pt-6">
            <p className="text-xs text-[var(--foreground-muted)]">
              &copy; {new Date().getFullYear()} Vigil, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
