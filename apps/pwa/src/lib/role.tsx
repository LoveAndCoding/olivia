/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ActorRole } from '@olivia/contracts';

const STORAGE_KEY = 'olivia-role';

type RoleContextValue = { role: ActorRole; setRole: (role: ActorRole) => void };
const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<ActorRole>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'spouse' ? 'spouse' : 'stakeholder';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  const value = useMemo(() => ({ role, setRole: setRoleState }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('Role context is not available.');
  }
  return context;
}
