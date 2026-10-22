import { useEffect, useState } from "react";
import type { Purchase } from "./types";

export function PurchasePage({ id }: { id: string }) {
  const [purchase, setPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then((r) => r.json())
      .then(setPurchase);
  }, [id]);

  if (!purchase) {
    return <p>Loading purchase...</p>;
  }

  return (
    <main className="purchase">
      <h1>Purchase {purchase.id}</h1>
      <dl>
        <dt>Item</dt>
        <dd>{purchase.itemId}</dd>
        <dt>Amount</dt>
        <dd>
          {(purchase.amountCents / 100).toFixed(2)} {purchase.currency.toUpperCase()}
        </dd>
        <dt>Status</dt>
        <dd>{purchase.status}</dd>
      </dl>
      {purchase.refundError && (
        <p className="purchase-error" role="alert">
          Refund failed, support has been notified: {purchase.refundError}
        </p>
      )}
      {purchase.status === "refunded" && (
        <p className="purchase-note">This purchase was refunded to your card.</p>
      )}
      {purchase.refundId && (
        <small className="purchase-refund-id">Refund {purchase.refundId}</small>
      )}
    </main>
  );
}
