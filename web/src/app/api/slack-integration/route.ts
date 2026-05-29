import { NextResponse } from "next/server";
import { createClient } from "src/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const webhookUrl = String(formData.get("webhook_url") ?? "").trim();

    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "Invalid Slack webhook URL" },
        { status: 400 },
      );
    }

    const testPayload = { text: "Vigil Slack integration test — connection successful." };
    const testResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: "Webhook URL validation failed. Check the URL and try again." },
        { status: 400 },
      );
    }

    await supabase
      .from("users")
      .update({ slack_webhook_url: webhookUrl })
      .eq("id", user.id);

    return NextResponse.redirect(
      new URL("/settings?slack=connected", request.url),
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to configure Slack integration." },
      { status: 500 },
    );
  }
}
