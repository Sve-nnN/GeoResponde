import { describe, it, expect } from 'vitest';
import { RingBuffer } from '../ringBuffer.js';
import { HEALTH_WINDOW, classifyOutcome } from '../types.js';

describe('RingBuffer', () => {
  it('defaults capacity to HEALTH_WINDOW when constructed with no arg', () => {
    const buf = new RingBuffer<number>();
    for (let i = 0; i < HEALTH_WINDOW + 5; i++) buf.push(i);
    expect(buf.toArray().length).toBe(HEALTH_WINDOW);
  });

  it('keeps all items in insertion order when below capacity', () => {
    const buf = new RingBuffer<number>(5);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.toArray()).toEqual([1, 2, 3]);
  });

  it('evicts the oldest items past capacity', () => {
    const capacity = 4;
    const buf = new RingBuffer<number>(capacity);
    for (let i = 0; i < capacity + 3; i++) buf.push(i);
    const arr = buf.toArray();
    expect(arr.length).toBe(capacity);
    // the first 3 pushed (0, 1, 2) are gone
    expect(arr).not.toContain(0);
    expect(arr).not.toContain(1);
    expect(arr).not.toContain(2);
    expect(arr).toEqual([3, 4, 5, 6]);
  });

  it('size reflects current count; empty buffer toArray() is []', () => {
    const buf = new RingBuffer<number>(3);
    expect(buf.size).toBe(0);
    expect(buf.toArray()).toEqual([]);
    buf.push(1);
    expect(buf.size).toBe(1);
  });

  it('a capacity of 1 keeps only the last pushed item', () => {
    const buf = new RingBuffer<number>(1);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    expect(buf.toArray()).toEqual([3]);
  });
});

describe('classifyOutcome', () => {
  it('maps ok and empty to up', () => {
    expect(classifyOutcome('ok')).toBe('up');
    expect(classifyOutcome('empty')).toBe('up');
  });

  it('maps error to down', () => {
    expect(classifyOutcome('error')).toBe('down');
  });

  it('maps not_found to null (do not record)', () => {
    expect(classifyOutcome('not_found')).toBeNull();
  });
});
