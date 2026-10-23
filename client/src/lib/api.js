import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8800/api/v1',
  timeout: 5000,
  withCredentials: true, // required so the auth cookie is sent
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    // API errors are { message: '...' } but handle plain strings too
    const message =
      (typeof data === 'string' ? data : data?.message) ||
      error.message ||
      'Something went wrong';

    toast.error(message);

    return Promise.reject(error);
  }
);

export default api;
