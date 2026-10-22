import { db } from "../db";
import { Purchase } from "./types";

export async function rollbackPurchase(purchaseId: string): Promise<Purchase> {
  const purchase = await db.purchases.get(purchaseId);
  if (!purchase) {
    throw new Error(`unknown purchase ${purchaseId}`);
  }
  if (purchase.status === "rolled_back") {
    return purchase;
  }
  await db.inventory.revoke(purchase.userId, purchase.itemId);
  const updated = { ...purchase, status: "rolled_back" as const };
  await db.purchases.put(updated);
  return updated;
}
