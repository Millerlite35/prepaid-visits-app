import "server-only";

// Reads a setting from .env.local (or the host's environment settings).
// Fails loudly with a plain-language message instead of a confusing crash later.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing setting ${name}. Copy .env.example to .env.local, fill it in, then restart "npm run dev".`,
    );
  }
  return value;
}
