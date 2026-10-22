import type Stripe from "stripe";
import { db } from "../db";
import { stripe } from "./stripe";
import { markRefunded } from "./refund";

const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function handleWebhook(
  body: string,
  signature: string,
): Promise<{ status: number }> {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.warn(`webhook signature rejected: ${String(err)}`);
    return { status: 400 };
  }

  switch (event.type) {
    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      const id = charge.metadata.purchaseId;
      const purchase = id ? await db.purchases.get(id) : undefined;
      if (purchase && purchase.status === "pending") {
        await db.purchases.put({ ...purchase, status: "paid", chargeId: charge.id });
        await db.inventory.grant(purchase.userId, purchase.itemId);
      }
      break;
    }
    case "charge.refunded": {
      // Also fires for refunds made in the Stripe dashboard.
      const charge = event.data.object as Stripe.Charge;
      if (!charge.refunded) {
        // Partial refunds are handled by support, not by this webhook.
        break;
      }
      console.info(`charge ${charge.id} fully refunded`);
      const known = await markRefunded(charge.id);
      if (!known) {
        console.warn(`charge.refunded for unknown charge ${charge.id}`);
        return { status: 202 };
      }
      break;
    }
    default:
      break;
  }
  return { status: 200 };
}
