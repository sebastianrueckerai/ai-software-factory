export type Role = "gunner" | "shield" | "engine";

export interface Ship {
  x: number;
  y: number;
  hull: number;
  crew: Map<string, Role>;
}

export function damage(ship: Ship, amount: number, shieldUp: boolean): Ship {
  const taken = shieldUp ? Math.ceil(amount / 3) : amount;
  return { ...ship, hull: Math.max(0, ship.hull - taken) };
}

export function isDestroyed(ship: Ship): boolean {
  return ship.hull <= 0;
}
