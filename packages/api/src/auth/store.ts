import { InvestorModel } from '../models/index.js';
import { adminAddresses } from '../config.js';
import type { Role } from './jwt.js';

export interface AuthUser {
  address: string;
  roles: Role[];
}

/**
 * Persistence the auth flow needs, behind an interface so routes can be tested
 * with an in-memory implementation and run in production against MongoDB.
 */
export interface AuthStore {
  saveNonce(address: string, nonce: string): Promise<void>;
  /** Return and clear the pending nonce, so each challenge is single-use. */
  takeNonce(address: string): Promise<string | null>;
  login(address: string): Promise<AuthUser>;
}

const norm = (address: string): string => address.toLowerCase();

function rolesFor(address: string, existing: string[] = []): Role[] {
  const roles = new Set<Role>(existing as Role[]);
  roles.add('investor');
  if (adminAddresses().has(norm(address))) roles.add('admin');
  return [...roles];
}

export class MongoAuthStore implements AuthStore {
  async saveNonce(address: string, nonce: string): Promise<void> {
    await InvestorModel.updateOne(
      { address: norm(address) },
      { $set: { nonce }, $setOnInsert: { roles: ['investor'] } },
      { upsert: true },
    );
  }

  async takeNonce(address: string): Promise<string | null> {
    const doc = await InvestorModel.findOneAndUpdate(
      { address: norm(address) },
      { $set: { nonce: null } },
    );
    return doc?.nonce ?? null;
  }

  async login(address: string): Promise<AuthUser> {
    const doc = await InvestorModel.findOne({ address: norm(address) });
    const roles = rolesFor(address, doc?.roles);
    await InvestorModel.updateOne(
      { address: norm(address) },
      { $set: { roles } },
      { upsert: true },
    );
    return { address: norm(address), roles };
  }
}

/** In-memory store for tests; no database required. */
export class InMemoryAuthStore implements AuthStore {
  private nonces = new Map<string, string>();

  async saveNonce(address: string, nonce: string): Promise<void> {
    this.nonces.set(norm(address), nonce);
  }

  async takeNonce(address: string): Promise<string | null> {
    const nonce = this.nonces.get(norm(address)) ?? null;
    this.nonces.delete(norm(address));
    return nonce;
  }

  async login(address: string): Promise<AuthUser> {
    return { address: norm(address), roles: rolesFor(address) };
  }
}
