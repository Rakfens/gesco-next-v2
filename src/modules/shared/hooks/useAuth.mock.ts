import { useState } from "react";

interface SessionUser {
  email: string;
}

interface Session {
  user: SessionUser;
}

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>({ user: { email: "admin@aterinay.com" } });
  const [loading, _setLoading] = useState(false);

  const login = async (email: string, _password: string): Promise<void> => {
    setSession({ user: { email: email || "admin@aterinay.com" } });
  };

  const logout = async (): Promise<void> => {
    setSession(null);
  };

  return { session, loading, login, logout };
};
