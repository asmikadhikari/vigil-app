import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 501 },
      );
    }

    const stripe = await getStripe();
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature ?? "",
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as { client_reference_id?: string; metadata?: Record<string, string> };
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (userId) {
          await supabase
            .from("users")
            .update({ plan_tier: "pro" })
            .eq("id", userId);
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          status: string;
          metadata?: Record<string, string>;
        };
        const userId = subscription.metadata?.user_id;
        if (userId) {
          const tier = (subscription.status === "active" || subscription.status === "trialing") ? "pro" : "free";
          await supabase
            .from("users")
            .update({ plan_tier: tier })
            .eq("id", userId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
