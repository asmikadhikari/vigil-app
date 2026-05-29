"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState } from "react";
import { addTrackedUrl, type ActionResult } from "src/app/actions";

const initialState: ActionResult = {
  ok: false,
  message: "",
};

export function TrackedUrlForm({
  competitorId,
  disabled,
}: {
  competitorId: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    addTrackedUrl.bind(null, competitorId),
    initialState,
  );

  return (
    <form action={formAction} className="rounded-lg border border-[var(--border)] bg-[var(--surface-75)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Tracked URLs</h2>
          <p className="text-xs text-[var(--foreground-lighter)]">Add public pages for the scraper to hash and diff.</p>
        </div>
        <Plus className="h-5 w-5 text-[var(--foreground-lighter)]" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_auto]">
        <input
          name="url"
          type="text"
          placeholder="https://competitor.com/pricing"
          disabled={disabled || pending}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand)] disabled:opacity-50"
          required
        />
        <select
          name="page_type"
          disabled={disabled || pending}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] disabled:opacity-50"
          defaultValue="pricing"
        >
          <option value="homepage">Homepage</option>
          <option value="pricing">Pricing</option>
          <option value="product">Product</option>
          <option value="careers">Careers</option>
          <option value="blog">Blog</option>
        </select>
        <button
          type="submit"
          disabled={disabled || pending}
          className="inline-flex h-[38px] items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </div>
      <details className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-100)] p-3">
        <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[var(--foreground-lighter)]">
          Scrape options
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-[var(--foreground-lighter)]">Wait for CSS selector</span>
            <input
              name="wait_for"
              type="text"
              placeholder="[class*='pricing']"
              disabled={disabled || pending}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--brand)] disabled:opacity-50"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold text-[var(--foreground-lighter)]">Minimum chars</span>
            <input
              name="min_content_length"
              type="number"
              min="20"
              max="2000"
              defaultValue="80"
              disabled={disabled || pending}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-75)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] disabled:opacity-50"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--foreground-light)]">
          <input
            name="premium_proxy"
            type="checkbox"
            disabled={disabled || pending}
            className="h-4 w-4 rounded border-[var(--border-strong)] bg-[var(--surface-75)] accent-[var(--brand)]"
          />
          Use premium proxy for heavily protected pages
        </label>
      </details>
      {state.message && (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-400" : "text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
