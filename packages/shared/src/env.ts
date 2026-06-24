import { z } from 'zod';

/** A 0x-prefixed, 20-byte EVM address. */
export const evmAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/u, 'must be a 0x-prefixed 20-byte address')
  .transform((value) => value as `0x${string}`);

/** An http(s) URL. */
export const httpUrl = z.string().url();

/**
 * Validate an env source against a schema. Throws a single readable error listing
 * every missing or invalid key, so a misconfigured service fails fast at boot
 * rather than deep inside a request. The source is passed explicitly so this works
 * in both Node (`process.env`) and the browser (build-time env).
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
