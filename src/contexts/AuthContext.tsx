import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import type { User } from "@/lib/models";
import { ensureAdminUser, getCurrentUser } from "@/lib/auth";
import { seedBuiltinBooksIfNeeded } from "@/lib/books";

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    await ensureAdminUser();
    await seedBuiltinBooksIfNeeded();
    const u = await getCurrentUser();
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
