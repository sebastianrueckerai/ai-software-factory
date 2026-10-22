import type Stripe from "stripe";
import { db } from "../db";
import type { Purchase } from "../store/types";
import { stripe } from "./stripe";

export type RefundResult =
  | { ok: true; refundId: string }
  | { ok: false; reason: string };

// One Stripe refund per paid purchase. The purchase id is the idempotency
// key, so a rollback the game server sends twice still refunds once: Stripe
// answers the second call with the first refund.
export async function refundPurchase(purchase: Purchase): Promise<RefundResult> {
  if (purchase.status !== "rolled_back" || !purchase.chargeId) {
    return { ok: false, reason: "purchase was never paid" };
  }
  if (purchase.refundId) {
    return { ok: true, refundId: purchase.refundId };
  }

  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create(
      {
        charge: purchase.chargeId,
        metadata: { purchaseId: purchase.id },
      },
      { idempotencyKey: `refund-${purchase.id}` },
    );
  } catch (err) {
    const reason = describe(err);
    console.error(`refund failed for purchase ${purchase.id}: ${reason}`);
    await db.purchases.put({ ...purchase, refundError: reason });
    return { ok: false, reason };
  }

  await db.purchases.put({
    ...purchase,
    refundId: refund.id,
    refundError: undefined,
  });
  return { ok: true, refundId: refund.id };
}

// Called by the charge.refunded webhook once Stripe confirms the money moved.
// Returns false for a charge the store does not know, so the caller can log it.
export async function markRefunded(chargeId: string): Promise<boolean> {
  const purchase = await db.purchases.findByCharge(chargeId);
  if (!purchase) {
    return false;
  }
  if (purchase.status !== "refunded") {
    await db.purchases.put({ ...purchase, status: "refunded" });
  }
  return true;
}

function describe(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  // Not an Error object: nothing useful to show support.
  return "the refund failed";
}
