import { NextResponse, type NextRequest } from "next/server";
import { createClient, hasSupabaseServerEnv } from "src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (!next.startsWith("/") || next.includes("://")) {
    return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
  }

  if (code && hasSupabaseServerEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
