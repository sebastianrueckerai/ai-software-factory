export type PurchaseStatus = "pending" | "paid" | "rolled_back" | "refunded";

export interface Purchase {
  id: string;
  playerId: string;
  itemId: string;
  amountCents: number;
  currency: string;
  status: PurchaseStatus;
  chargeId?: string;
  refundId?: string;
  refundError?: string;
}
