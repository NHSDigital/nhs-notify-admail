import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ username: '', password: '', isAuthenticated: false });
  const [error, setError] = useState('');
  const EnvBackendApiBaseUrl = process.env.REACT_APP_BACKEND_API_BASE_URL || '';

  const authorize = async (username, password) => {
    try {
      const base64Credentials = btoa(`${username}:${password}`);
      const response = await axios.post(
        `https://${EnvBackendApiBaseUrl}/authorize`,
        {},
        {
          headers: {
            'Authorization': `Basic ${base64Credentials}`,
          },
          validateStatus: () => true // allow handling of non-200s
        }
      );
      if (response.status !== 200) {
        return { success: false, message: 'Incorrect username or password.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Error connecting to login service.' };
    }
  };

  const login = async (username, password) => {
    const result = await authorize(username, password);
    if (result.success) {
      setAuth({ username, password, isAuthenticated: true });
      setError('');
    } else {
      setAuth({ username: '', password: '', isAuthenticated: false });
      setError(result.message);
    }
    return result;
  };

  const logout = () => {
    setAuth({ username: '', password: '', isAuthenticated: false });
    setError('');
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
