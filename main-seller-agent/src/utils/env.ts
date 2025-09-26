import dotenv from 'dotenv';

dotenv.config();

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvNumber(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${key}`);
  }
  return parsed;
}

export function getEnvBool(key: string, defaultValue?: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return raw === 'true' || raw === '1';
}
