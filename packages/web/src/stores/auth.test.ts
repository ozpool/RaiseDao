import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth';

// persist warns that storage is unavailable under node — harmless; we're testing
// the reducer logic, not the localStorage round-trip (that's exercised in-browser).
beforeEach(() => useAuthStore.getState().clear());

describe('auth store', () => {
  it('setAuth stores token + session and marks authenticated', () => {
    useAuthStore.getState().setAuth('tok', { address: '0xabc', roles: ['investor'] });
    const s = useAuthStore.getState();
    expect(s.token).toBe('tok');
    expect(s.session).toEqual({ address: '0xabc', roles: ['investor'] });
    expect(s.status).toBe('authenticated');
  });

  it('clear wipes token, session, and status', () => {
    useAuthStore.getState().setAuth('tok', { address: '0xabc', roles: [] });
    useAuthStore.getState().clear();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.session).toBeNull();
    expect(s.status).toBe('unauthenticated');
  });

  it('setStatus transitions without dropping the token', () => {
    useAuthStore.getState().setAuth('tok', { address: '0xabc', roles: [] });
    useAuthStore.getState().setStatus('authenticating');
    expect(useAuthStore.getState().status).toBe('authenticating');
    expect(useAuthStore.getState().token).toBe('tok');
  });
});
