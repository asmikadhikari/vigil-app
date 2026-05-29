"use server";

import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseServerEnv } from "src/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message: string;
};

async function getLiveClient() {
  if (!hasSupabaseServerEnv()) {
    return { supabase: null, message: "Configure Supabase env keys to save changes." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, message: "Sign in to save changes." };
  }

  return { supabase, message: "" };
}

export async function markAlertRead(alertId: string): Promise<ActionResult> {
  const { supabase, message } = await getLiveClient();

  if (!supabase) {
    return { ok: false, message };
  }

  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", alertId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Alert marked read." };
}

export async function setCompetitorStatus(
  competitorId: string,
  status: "tracking" | "paused",
): Promise<ActionResult> {
  const { supabase, message } = await getLiveClient();

  if (!supabase) {
    return { ok: false, message };
  }

  const { error } = await supabase
    .from("competitors")
    .update({ status })
    .eq("id", competitorId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/competitors/${competitorId}`);
  return { ok: true, message: status === "tracking" ? "Tracking resumed." : "Competitor paused." };
}

export async function addTrackedUrl(
  competitorId: string,
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, message } = await getLiveClient();
  const url = String(formData.get("url") ?? "").trim();
  const pageType = String(formData.get("page_type") ?? "homepage");
  const waitFor = String(formData.get("wait_for") ?? "").trim();
  const minContentLengthValue = Number(formData.get("min_content_length") ?? 80);
  const premiumProxy = formData.get("premium_proxy") === "on";

  if (!url) {
    return { ok: false, message: "Enter a URL to track." };
  }

  if (!supabase) {
    return { ok: false, message };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return { ok: false, message: "Enter a valid URL." };
  }

  if (!["homepage", "pricing", "product", "careers", "blog"].includes(pageType)) {
    return { ok: false, message: "Choose a valid page type." };
  }

  const minContentLength = Number.isFinite(minContentLengthValue)
    ? Math.max(20, Math.min(2000, minContentLengthValue))
    : 80;

  const { error } = await supabase.from("competitor_sites").insert({
    competitor_id: competitorId,
    url: parsedUrl.toString(),
    page_type: pageType,
    scrape_config: {
      js_render: true,
      premium_proxy: premiumProxy,
      min_content_length: minContentLength,
      ...(waitFor ? { wait_for: waitFor } : {}),
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/competitors/${competitorId}`);
  return { ok: true, message: "Tracked URL added." };
}
