import { useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../components/AuthContext';

export function useConvertAPI() {
  const { user, refreshSession } = useAuth();

  // Create Axios instance with memoization to prevent recreation on every render
  const convertAPI = useMemo(() => {
    const instance = axios.create({
      baseURL: window.env?.REACT_APP_BACKEND_API_BASE_URL || process.env.REACT_APP_BACKEND_API_BASE_URL,
      headers: {
        'Authorization': user?.accessToken ? `Bearer ${user.accessToken}` : '',
      },
    });

    // Store refresh token request to prevent multiple simultaneous refreshes
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach((prom) => {
        if (token) {
          prom.resolve(token);
        } else {
          prom.reject(error);
        }
      });
      failedQueue = [];
    };

    // Request interceptor to add access token
    instance.interceptors.request.use(
      (config) => {
        if (user?.accessToken) {
          config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle 401 errors
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return instance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const newToken = await refreshSession();
            processQueue(null, newToken);

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            processQueue(refreshError, null);
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('idToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('userEmail');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }, [user, refreshSession]); // Recreate instance only if user or refreshSession changes

  return convertAPI;
}
