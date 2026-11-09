import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export function pinKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function generatePin(length: number): string {
  const digits = Math.min(Math.max(length, 4), 8);
  let pin = '';
  while (pin.length < digits) {
    const byte = randomBytes(1)[0] ?? 0;
    if (byte >= 250) {
      continue;
    }
    pin += String(byte % 10);
  }
  return pin;
}

export function encryptPin(pin: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptPin(payload: string, key: Buffer): string {
  const buffer = Buffer.from(payload, 'base64url');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
