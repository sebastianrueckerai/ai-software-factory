import type { Purchase } from "./store/types";

const purchases = new Map<string, Purchase>();
const grants = new Set<string>();

export const db = {
  purchases: {
    async get(id: string): Promise<Purchase | undefined> {
      return purchases.get(id);
    },
    async put(purchase: Purchase): Promise<void> {
      purchases.set(purchase.id, purchase);
    },
    async findByCharge(chargeId: string): Promise<Purchase | undefined> {
      return [...purchases.values()].find((p) => p.chargeId === chargeId);
    },
  },
  inventory: {
    async grant(playerId: string, itemId: string): Promise<void> {
      grants.add(`${playerId}:${itemId}`);
    },
    async revoke(playerId: string, itemId: string): Promise<void> {
      grants.delete(`${playerId}:${itemId}`);
    },
  },
};
