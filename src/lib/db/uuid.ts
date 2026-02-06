/**
 * UUID Generator utility
 * Uses crypto.randomUUID() for generating valid UUIDs
 */
import { randomUUID } from 'crypto';

/**
 * Generate a valid UUID v4
 */
export function generateUUID(): string {
  return randomUUID();
}
