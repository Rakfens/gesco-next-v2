// @ts-nocheck
import { useState } from 'react';

export const useAuth = () => {
  const [session, setSession] = useState({ user: { email: 'admin@aterinay.com' } });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setSession({ user: { email: email || 'admin@aterinay.com' } });
  };

  const logout = async () => {
    setSession(null);
  };

  return { session, loading, login, logout };
};