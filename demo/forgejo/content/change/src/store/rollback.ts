import { db } from "../db";
import { refundPurchase } from "../payments/refund";
import { Purchase } from "./types";

export async function rollbackPurchase(purchaseId: string): Promise<Purchase> {
  const purchase = await db.purchases.get(purchaseId);
  if (!purchase) {
    throw new Error(`unknown purchase ${purchaseId}`);
  }
  if (purchase.status === "rolled_back") {
    return purchase;
  }
  await db.inventory.revoke(purchase.playerId, purchase.itemId);
  const updated: Purchase = { ...purchase, status: "rolled_back" };
  await db.purchases.put(updated);
  if (updated.chargeId) {
    const result = await refundPurchase(updated);
    if (!result.ok) {
      console.warn(`purchase ${updated.id} rolled back, refund failed: ${result.reason}`);
    }
  }
  return (await db.purchases.get(updated.id)) ?? updated;
}
