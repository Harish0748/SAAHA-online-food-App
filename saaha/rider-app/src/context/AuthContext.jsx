import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [rider, setRider] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedRider] = await AsyncStorage.multiGet([
          'saaha_rider_token',
          'saaha_rider_user',
        ]);
        if (storedToken[1] && storedRider[1]) {
          setToken(storedToken[1]);
          setRider(JSON.parse(storedRider[1]));
        }
      } catch (e) {
        console.warn('Auth restore failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const register = useCallback(async (form) => {
    const { data } = await api.post('/auth/rider/register', form);
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/rider/login', { email, password });
    if (data.success) {
      await AsyncStorage.setItem('saaha_rider_token', data.token);
      await AsyncStorage.setItem('saaha_rider_user', JSON.stringify(data.rider));
      setToken(data.token);
      setRider(data.rider);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['saaha_rider_token', 'saaha_rider_user']);
    setToken(null);
    setRider(null);
  }, []);

  const updateRider = useCallback((patch) => {
    setRider((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem('saaha_rider_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ rider, token, loading, register, login, logout, updateRider, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
