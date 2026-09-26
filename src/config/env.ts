import 'dotenv/config';

/**
 * Single source of truth for environment-driven configuration.
 *
 * Every value has a working default so the suite runs out of the box against
 * the public OrangeHRM demo, while CI or a local `.env` can point it at another
 * instance without touching a line of test code.
 */

function readString(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const baseUrl = readString('BASE_URL', 'https://opensource-demo.orangehrmlive.com').replace(/\/+$/, '');

export const env = {
  isCI: readBoolean('CI', false),

  baseUrl,

  /** Credentials published by OrangeHRM for their public demo instance. */
  credentials: {
    username: readString('ORANGEHRM_USERNAME', 'Admin'),
    password: readString('ORANGEHRM_PASSWORD', 'admin123'),
  },

  headless: readBoolean('HEADLESS', true),
} as const;
