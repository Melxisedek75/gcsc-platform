// Synthetic browser fixture only. Never imported by the application entry point.
type Role = 'homeowner' | 'contractor';
type Request = { fullName: string; email: string; password: string; phone: string; role: Role };
const fixtureWindow = window as typeof window & {
  __roleSeed?: Role;
  __roleTest: {
    calls: { method: string; input: Record<string, unknown> }[];
    deferred: boolean;
    release?: () => void;
  };
};
const state: typeof fixtureWindow.__roleTest = fixtureWindow.__roleTest = { calls: [], deferred: false };
const user = (role: Role) => ({ id: 101, role, fullName: 'Synthetic Test', email: 'role-test@example.test' });
const record = (method: string, input: Record<string, unknown>) => state.calls.push({ method, input: { ...input } });

export const api = {
  async register(input: Request) {
    record('register', input);
    if (state.deferred) await new Promise<void>(resolve => { fixtureWindow.__roleTest.release = resolve; });
    return { verification_required: true, verification_channel: input.role === 'homeowner' ? 'sms' : 'email' };
  },
  async checkVerification(input: Record<string, unknown>) {
    record('verify', input);
    return { token: 'synthetic-session', user: user(input.role as Role) };
  },
  async login(input: Record<string, unknown>) {
    record('login', input);
    return { token: 'synthetic-session', user: user('contractor') };
  },
  async getProfile() {
    if (!fixtureWindow.__roleSeed) throw new Error('No synthetic session');
    return { user: user(fixtureWindow.__roleSeed) };
  },
  setToken(token: string) { localStorage.setItem('gcsc_auth_token', token); },
  clearToken() { localStorage.removeItem('gcsc_auth_token'); },
  logout() { localStorage.removeItem('gcsc_auth_token'); },
};

export async function loginWithWebAuth() {
  throw new Error('Wallet calls are prohibited in the role fixture');
}
