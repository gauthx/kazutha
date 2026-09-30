import { describe, it, expect } from 'vitest';
import { computePeek } from '../src/utils/handLayout';

describe('computePeek', () => {
  it('returns 0 for 0 cards', () => {
    expect(computePeek(0, 1280, 86)).toBe(0);
  });

  it('returns 0 for 1 card', () => {
    expect(computePeek(1, 1280, 86)).toBe(0);
  });

  it('returns natural peek (35) when hand fits comfortably', () => {
    expect(computePeek(5, 1280, 86)).toBe(35);
  });

  it('compresses peek for 26 cards at 1280px viewport', () => {
    const peek = computePeek(26, 1280, 86);
    const totalWidth = 86 + 25 * peek;
    expect(totalWidth).toBeLessThanOrEqual(1280);
    expect(peek).toBeGreaterThan(0);
  });

  it('returns 0 when container is too narrow to show any peek', () => {
    expect(computePeek(10, 86, 86)).toBe(0);
  });

  it('never exceeds natural peek of 35', () => {
    expect(computePeek(2, 5000, 86)).toBe(35);
  });
});
