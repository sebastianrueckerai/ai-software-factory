import type Stripe from "stripe";
import { db } from "../db";
import { stripe } from "./stripe";

const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function handleWebhook(
  body: string,
  signature: string,
): Promise<{ status: number }> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return { status: 400 };
  }

  switch (event.type) {
    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      const id = charge.metadata.purchaseId;
      const purchase = id ? await db.purchases.get(id) : undefined;
      if (purchase && purchase.status === "pending") {
        await db.purchases.put({ ...purchase, status: "paid", chargeId: charge.id });
        await db.inventory.grant(purchase.playerId, purchase.itemId);
      }
      break;
    }
    default:
      break;
  }
  return { status: 200 };
}
