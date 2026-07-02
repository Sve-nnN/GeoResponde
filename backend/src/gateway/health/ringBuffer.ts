import { HEALTH_WINDOW } from './types.js';

/**
 * Generic, count-based, fixed-capacity ring buffer. Used to keep only the
 * most recent N items per key (e.g. per-provider health samples) with
 * oldest-eviction on overflow. Implemented as a plain array with
 * shift-on-overflow rather than a true circular index — this holds tens of
 * items, not a hot path, so the readable implementation wins (mirrors the
 * small-and-legible style of transports/cache.ts).
 *
 * Generic and payload-agnostic: it stores exactly what callers push, nothing
 * more. Callers are responsible for keeping pushed items PII-free.
 */
export class RingBuffer<T> {
  private readonly items: T[] = [];
  private readonly capacity: number;

  constructor(capacity: number = HEALTH_WINDOW) {
    this.capacity = capacity;
  }

  /** Append an item, evicting the oldest entry if over capacity. */
  push(item: T): void {
    this.items.push(item);
    while (this.items.length > this.capacity) {
      this.items.shift();
    }
  }

  /** Current contents, oldest first. */
  toArray(): T[] {
    return [...this.items];
  }

  /** Current item count. */
  get size(): number {
    return this.items.length;
  }
}
