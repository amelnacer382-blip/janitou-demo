import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPin(pin: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(pin, salt, KEY_LENGTH).toString('hex') };
}

export function verifyPin(pin: string, salt: string, hash: string): boolean {
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pin, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
