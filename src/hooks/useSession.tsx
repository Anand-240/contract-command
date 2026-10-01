import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hasPermission, type Permission } from '@/constants';
import { getAuthToken, request, setAuthToken } from '@/services/apiClient';
import type { Role, User } from '@/types';

interface SessionValue {
  user: User;
  role: Role;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  can: (permission: Permission) => boolean;
}
const SessionContext = createContext<SessionValue | null>(null);
const emptyUser: User = { id: '', name: '', initials: '', role: 'auditor', designation: '', department: '', email: '' };
function storedUser(): User | null {
  try {
    const raw = sessionStorage.getItem('cc.user');
    return getAuthToken() && raw ? JSON.parse(raw) as User : null;
  } catch { return null; }
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(storedUser);
  const signOut = useCallback(() => {
    if (getAuthToken()) void request({ method: 'POST', path: '/auth/logout/' }).catch(() => undefined);
    setAuthToken(null);
    sessionStorage.removeItem('cc.user');
    setUser(null);
  }, []);
  useEffect(() => {
    const handler = () => { setUser(null); };
    window.addEventListener('cc:unauthorized', handler);
    return () => window.removeEventListener('cc:unauthorized', handler);
  }, []);
  useEffect(() => {
    if (!getAuthToken()) return;
    void request<User>({ method: 'GET', path: '/auth/me/' }).then((fresh) => {
      sessionStorage.setItem('cc.user', JSON.stringify(fresh));
      setUser(fresh);
    }).catch(() => signOut());
  }, [signOut]);
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await request<{ token: string; user: User }>({ method: 'POST', path: '/auth/login/', body: { email, password } });
    setAuthToken(result.token);
    sessionStorage.setItem('cc.user', JSON.stringify(result.user));
    setUser(result.user);
  }, []);
  const value = useMemo<SessionValue>(() => ({
    user: user ?? emptyUser,
    role: user?.role ?? 'auditor',
    signedIn: !!user,
    signIn,
    signOut,
    can: (permission) => !!user && hasPermission(user.role, permission),
  }), [user, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
