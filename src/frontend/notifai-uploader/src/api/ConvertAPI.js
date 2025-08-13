import axios from 'axios';
import { useAuth } from './AuthContext';


export default function ConvertAPI() {
  const { user, refreshSession } = useAuth();
  const EnvBackendApiBaseUrl = window.env?.REACT_APP_BACKEND_API_BASE_URL || process.env.REACT_APP_BACKEND_API_BASE_URL;


  const convertAPI = axios.create({
    baseURL:  `https://${EnvBackendApiBaseUrl}/convert`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  convertAPI.interceptors.request.use(request => {
    if (user.idToken) {
      request.headers['Authorization'] = `Bearer ${user.idToken}`;
    }
    return request;
  }, error => {
    return Promise.reject(error);
  });

  convertAPI.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the request as retried to avoid infinite loops.
      try {
        await refreshSession();
        convertAPI.defaults.headers.common['Authorization'] = `Bearer ${user.idToken}`;
        return convertAPI(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);



}
