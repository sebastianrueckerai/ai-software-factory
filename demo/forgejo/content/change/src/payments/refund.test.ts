import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import { rollbackPurchase } from "../store/rollback";
import type { Purchase } from "../store/types";
import { markRefunded } from "./refund";

// Stripe answers a repeated idempotency key with the first result, so the
// fake keeps one refund per key and counts the calls that created one.
const created = new Map<string, { id: string }>();
let calls = 0;
let decline = false;

vi.mock("./stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn(async (_params: unknown, opts: { idempotencyKey: string }) => {
        calls += 1;
        if (decline) {
          throw new Error("Your card was declined.");
        }
        const known = created.get(opts.idempotencyKey);
        if (known) {
          return known;
        }
        const refund = { id: `re_${created.size + 1}` };
        created.set(opts.idempotencyKey, refund);
        return refund;
      }),
    },
  },
}));

const paid: Purchase = {
  id: "pur_1001",
  playerId: "player_7",
  itemId: "skin-comet",
  amountCents: 499,
  currency: "usd",
  status: "paid",
  chargeId: "ch_3PqXyz",
};

beforeEach(async () => {
  created.clear();
  calls = 0;
  decline = false;
  await db.purchases.put({ ...paid });
  await db.inventory.grant(paid.playerId, paid.itemId);
});

describe("refund on rollback", () => {
  it("refunds once when the game server sends the rollback twice", async () => {
    await rollbackPurchase(paid.id);
    await rollbackPurchase(paid.id);

    expect(created.size).toBe(1);
    const stored = await db.purchases.get(paid.id);
    expect(stored?.status).toBe("rolled_back");
    expect(stored?.refundId).toBe("re_1");
  });

  it("uses the purchase id as the idempotency key", async () => {
    await rollbackPurchase(paid.id);

    expect([...created.keys()]).toEqual([`refund-${paid.id}`]);
  });

  it("does not refund a purchase that was never paid", async () => {
    await db.purchases.put({ ...paid, status: "pending", chargeId: undefined });
    await rollbackPurchase(paid.id);

    expect(calls).toBe(0);
  });

  it("records a declined refund on the purchase for support", async () => {
    decline = true;
    const result = await rollbackPurchase(paid.id);

    expect(result.status).toBe("rolled_back");
    expect(result.refundId).toBeUndefined();
    expect(result.refundError).toBe("Your card was declined.");
  });
});

describe("charge.refunded", () => {
  it("marks the purchase refunded", async () => {
    await rollbackPurchase(paid.id);

    expect(await markRefunded(paid.chargeId!)).toBe(true);
    expect((await db.purchases.get(paid.id))?.status).toBe("refunded");
  });
});
