import { describe, expect, it } from 'vitest';
import { decryptPin, encryptPin, generatePin, pinKey } from './pin-cipher.js';

describe('pickup PIN protection', () => {
  it('round-trips a PIN and rejects a different key', () => {
    const key = pinKey('test-pin-encryption-key-32-characters');
    const pin = generatePin(6);
    expect(pin).toMatch(/^\d{6}$/);
    const stored = encryptPin(pin, key);
    expect(stored).not.toContain(pin);
    expect(decryptPin(stored, key)).toBe(pin);
    expect(() => decryptPin(stored, pinKey('another-pin-encryption-key-32-chars'))).toThrow();
  });
});
