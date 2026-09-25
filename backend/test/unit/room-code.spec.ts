import { describe, it, expect } from 'vitest';
import { createRoomCodeGenerator } from '../../src/utils/room-code.js';

describe('createRoomCodeGenerator', () => {
  it('generates sequential numbers starting from specified initial value', () => {
    const generator = createRoomCodeGenerator(1000);
    expect(generator()).toBe(1000);
    expect(generator()).toBe(1001);
    expect(generator()).toBe(1002);
  });
});
