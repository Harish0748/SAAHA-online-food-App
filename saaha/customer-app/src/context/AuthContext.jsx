import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await AsyncStorage.multiGet([
          'saaha_customer_token',
          'saaha_customer_user',
        ]);
        if (storedToken[1] && storedUser[1]) {
          setToken(storedToken[1]);
          setUser(JSON.parse(storedUser[1]));
        }
      } catch (e) {
        console.warn('Auth restore failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendOtp = useCallback(async (phone) => {
    const { data } = await api.post('/auth/customer-otp/send-otp', { phone });
    return data; // { success, message, dev_otp? }
  }, []);

  const verifyOtp = useCallback(async (phone, otp, name) => {
    const { data } = await api.post('/auth/customer-otp/verify-otp', { phone, otp, name });
    if (data.success) {
      await AsyncStorage.setItem('saaha_customer_token', data.token);
      await AsyncStorage.setItem('saaha_customer_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['saaha_customer_token', 'saaha_customer_user']);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem('saaha_customer_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, sendOtp, verifyOtp, logout, updateUser, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
