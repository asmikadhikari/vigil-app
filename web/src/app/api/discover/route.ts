import { NextResponse } from "next/server";
import { createClient } from "src/lib/supabase/server";

type Suggestion = {
  domain: string;
  name: string;
  reason: string;
};

const DEMO_SUGGESTIONS: Suggestion[] = [
  { domain: "competitor-a.com", name: "Competitor A", reason: "Similar product-market positioning" },
  { domain: "competitor-b.io", name: "Competitor B", reason: "Overlapping target audience" },
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyUrl, description } = body;

    if (!companyUrl && !description) {
      return NextResponse.json(
        { error: "Provide companyUrl or description for discovery." },
        { status: 400 },
      );
    }

    const scraperUrl = process.env.SCRAPER_API_URL;
    if (scraperUrl) {
      const response = await fetch(`${scraperUrl}/api/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_url: companyUrl, description }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ suggestions: data.suggestions ?? [] });
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && description) {
      const prompt = `Given a company that describes itself as "${description}", suggest 3-5 likely competitors. Return a JSON array of { domain: string, name: string, reason: string }. Only include real, well-known companies.`;

      const aiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a competitive intelligence analyst. Suggest competitors based on company description.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        try {
          const parsed = JSON.parse(
            aiData.choices?.[0]?.message?.content ?? "{}",
          );
          const suggestions = (parsed.suggestions ?? parsed.competitors ?? []) as Suggestion[];
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            return NextResponse.json({ suggestions });
          }
        } catch {
          // fall through to demo
        }
      }
    }

    return NextResponse.json({ suggestions: DEMO_SUGGESTIONS });
  } catch {
    return NextResponse.json(
      { error: "Discovery request failed." },
      { status: 500 },
    );
  }
}
