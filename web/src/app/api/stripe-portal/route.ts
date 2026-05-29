import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "src/lib/supabase/server";
import { createAdminClient } from "src/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeInstance: any = null;

async function getStripe() {
  if (!stripeInstance) {
    const Stripe = await import("stripe");
    stripeInstance = new Stripe.default(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  try {
    const stripe = await getStripe();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const { url } = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/settings`,
    });

    return NextResponse.redirect(url!);
  } catch {
    return NextResponse.redirect(new URL("/settings", request.url));
  }
}
