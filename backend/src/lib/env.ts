/**
 * Reads a required environment variable and fails fast at startup if it is
 * missing, instead of failing later on the first request that needs it.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}
