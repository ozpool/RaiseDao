import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated configuration. Everything the API needs from the
 * environment is parsed once here, so the rest of the code reads a typed object
 * and a bad/missing variable fails fast at boot instead of deep in a request.
 */
const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/raisedao'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('7d'),
    SIWE_DOMAIN: z.string().default('localhost:3000'),
    SIWE_URI: z.string().url().default('http://localhost:3000'),
    SIWE_CHAIN_ID: z.coerce.number().int().positive().default(421614), // Arbitrum Sepolia
    ADMIN_ADDRESSES: z.string().default(''), // comma-separated wallet addresses
    // Indexer
    INDEXER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    RPC_URL: z.string().url().default('https://sepolia-rollup.arbitrum.io/rpc'),
    FACTORY_ADDRESS: z.string().default(''),
    INDEXER_START_BLOCK: z.coerce.number().int().nonnegative().default(0),
    INDEXER_CONFIRMATIONS: z.coerce.number().int().nonnegative().default(5),
    INDEXER_POLL_MS: z.coerce.number().int().positive().default(12000),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === 'production' && cfg.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'must be set to a strong value in production',
      });
    }
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => ` - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  return parsed.data;
}

/** Lowercased admin allowlist parsed from ADMIN_ADDRESSES. */
export function adminAddresses(cfg: Config = config): Set<string> {
  return new Set(
    cfg.ADMIN_ADDRESSES.split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const config = loadConfig();
