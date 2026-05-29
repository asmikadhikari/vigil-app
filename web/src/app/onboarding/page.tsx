"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  Eye,
  Globe2,
  Loader2,
  Search,
  Sparkles,
  Target,
  Text,
  Zap,
} from "lucide-react";
import { createClient, hasSupabaseBrowserEnv } from "src/lib/supabase/browser";

type Suggestion = {
  domain: string;
  name: string;
  reason: string;
};

export default function OnboardingPage() {
  const [companyUrl, setCompanyUrl] = useState("");
  const [description, setDescription] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!hasSupabaseBrowserEnv()) {
      setTimeout(() => {
        setLoading(false);
        setMessage("Demo setup complete. Add Supabase env keys to persist onboarding data.");
      }, 600);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setMessage("Please sign in before saving your monitoring setup.");
      return;
    }

    const normalizedDomain = competitorDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .trim();

    if (!normalizedDomain) {
      setLoading(false);
      setMessage("Please enter a competitor domain.");
      return;
    }

    const normalizedCompanyUrl = companyUrl.trim();
    try {
      new URL(normalizedCompanyUrl.startsWith("http") ? normalizedCompanyUrl : `https://${normalizedCompanyUrl}`);
    } catch {
      setLoading(false);
      setMessage("Please enter a valid company URL.");
      return;
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({ company_url: companyUrl, description })
      .eq("id", user.id);

    const { data: competitor, error: competitorError } = await supabase
      .from("competitors")
      .insert({
        user_id: user.id,
        name: normalizedDomain.split(".")[0] || "Primary competitor",
        domain: normalizedDomain,
        status: "tracking",
        discovered_by: "manual",
        ai_confidence: 1,
      })
      .select("id")
      .single();

    if (!competitorError && competitor) {
      await supabase.from("competitor_sites").insert([
        {
          competitor_id: competitor.id,
          url: `https://${normalizedDomain}`,
          page_type: "homepage",
        },
        {
          competitor_id: competitor.id,
          url: `https://${normalizedDomain}/pricing`,
          page_type: "pricing",
        },
        {
          competitor_id: competitor.id,
          url: `https://${normalizedDomain}/careers`,
          page_type: "careers",
        },
      ]);
    }

    setLoading(false);
    setMessage(
      profileError || competitorError
        ? profileError?.message ?? competitorError?.message ?? "Unable to save setup."
        : "Monitoring setup saved. Your scraper can now pick up tracked pages.",
    );
  }

  return (
    <main style={{ background: "var(--background)", color: "var(--foreground)" }} className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--foreground-light)" }}
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Left column – marketing copy */}
          <section>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md"
              style={{ background: "var(--brand)" }}
            >
              <Eye className="h-6 w-6" style={{ color: "var(--background)" }} />
            </div>
            <p
              className="mt-8 text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: "var(--brand)" }}
            >
              Monitoring setup
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
              Tell Vigil what market to watch.
            </h1>
            <p
              className="mt-5 max-w-xl text-sm leading-7"
              style={{ color: "var(--foreground-light)" }}
            >
              Your company context calibrates SWOT analysis. Competitor URLs seed the page tracker
              used by the Python scraper and weekly brief pipeline.
            </p>
          </section>

          {/* Right column – form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-md p-5 md:p-8"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-75)",
            }}
          >
            <div className="grid gap-5">
              <Field
                icon={Building2}
                label="Company URL"
                placeholder="https://yourcompany.com"
                value={companyUrl}
                onChange={setCompanyUrl}
                type="url"
              />
              <label className="grid gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--foreground-light)" }}
                >
                  Positioning description
                </span>
                <div className="relative">
                  <Text
                    className="absolute left-3.5 top-4 h-4 w-4"
                    style={{ color: "var(--foreground-muted)" }}
                  />
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="We sell..."
                    className="min-h-32 w-full rounded-md p-3.5 pl-10 text-sm placeholder:opacity-40 outline-none"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--surface-75)",
                      color: "var(--foreground)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    required
                  />
                </div>
              </label>
              <Field
                icon={Globe2}
                label="First competitor domain"
                placeholder="competitor.com"
                value={competitorDomain}
                onChange={setCompetitorDomain}
              />

              {companyUrl || description ? (
                <div
                  className="rounded-md p-4"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-100)",
                  }}
                >
                  <button
                    type="button"
                    disabled={discovering}
                    onClick={async () => {
                      setDiscovering(true);
                      try {
                        const res = await fetch("/api/discover", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ companyUrl, description }),
                        });
                        const data = await res.json();
                        setSuggestions(data.suggestions ?? []);
                      } catch {
                        setSuggestions([]);
                      } finally {
                        setDiscovering(false);
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold disabled:opacity-60"
                    style={{
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface-200)",
                      color: "var(--foreground-light)",
                    }}
                  >
                    {discovering ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    AI-discover competitors
                  </button>
                  {suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "var(--foreground-light)" }}
                      >
                        Suggestions
                      </p>
                      {suggestions.map((s) => (
                        <button
                          key={s.domain}
                          type="button"
                          onClick={() => {
                            setCompetitorDomain(s.domain);
                            setSuggestions([]);
                          }}
                          className="flex w-full items-center gap-3 rounded-md p-3 text-left hover:opacity-80"
                          style={{
                            border: "1px solid var(--border)",
                            background: "var(--surface-75)",
                          }}
                        >
                          <Target
                            className="h-4 w-4 shrink-0"
                            style={{ color: "var(--brand)" }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{s.name}</p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--foreground-muted)" }}
                            >
                              {s.reason}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div
                className="grid gap-3 rounded-md p-4 text-sm"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface-100)",
                  color: "var(--foreground-light)",
                }}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" style={{ color: "var(--brand)" }} />
                  Seeded trackers
                </div>
                <div className="grid gap-2 text-xs md:grid-cols-3">
                  <span
                    className="rounded-md px-3 py-2"
                    style={{
                      background: "var(--surface-75)",
                      color: "var(--foreground-lighter)",
                    }}
                  >
                    Homepage
                  </span>
                  <span
                    className="rounded-md px-3 py-2"
                    style={{
                      background: "var(--surface-75)",
                      color: "var(--foreground-lighter)",
                    }}
                  >
                    Pricing
                  </span>
                  <span
                    className="rounded-md px-3 py-2"
                    style={{
                      background: "var(--surface-75)",
                      color: "var(--foreground-lighter)",
                    }}
                  >
                    Careers
                  </span>
                </div>
              </div>

              {message && (
                <div
                  className="rounded-md p-4 text-sm"
                  style={{
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface-200)",
                    color: "var(--foreground-light)",
                  }}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:opacity-60"
                style={{
                  background: "var(--brand)",
                  color: "var(--background)",
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Save monitoring setup
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: typeof Globe2;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--foreground-light)" }}
      >
        {label}
      </span>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "var(--foreground-muted)" }}
        />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md p-3.5 pl-10 text-sm placeholder:opacity-40 outline-none"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-75)",
            color: "var(--foreground)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          required
        />
      </div>
    </label>
  );
}
