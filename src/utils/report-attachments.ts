import { test } from '@playwright/test';

/**
 * Attaches a JSON payload to the currently running test so the HTML report
 * carries the exact API evidence a reviewer needs, without polluting stdout.
 *
 * Safe to call from helpers that may also run outside a test context.
 */
export async function attachJson(name: string, payload: unknown): Promise<void> {
  try {
    await test.info().attach(name, {
      body: JSON.stringify(payload, null, 2),
      contentType: 'application/json',
    });
  } catch {
    // No active test (e.g. called from a global setup hook) — nothing to attach to.
  }
}
