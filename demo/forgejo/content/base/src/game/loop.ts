import { Ship } from "./ship";

const STEP_MS = 1000 / 60;

export function startLoop(update: (dt: number) => void, draw: () => void) {
  let last = performance.now();
  let acc = 0;
  let handle = 0;

  const frame = (now: number) => {
    acc += now - last;
    last = now;
    while (acc >= STEP_MS) {
      update(STEP_MS / 1000);
      acc -= STEP_MS;
    }
    draw();
    handle = requestAnimationFrame(frame);
  };

  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}

export type { Ship };
