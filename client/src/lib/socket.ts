import { io } from 'socket.io-client';
import api from './api';

// The realtime service can remain on a separate host. Auth is delivered
// through a one-use-in-memory, short-lived ticket fetched from our own origin.
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8800/api/v1';
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || new URL(backendUrl).origin;

export const createSocket = () =>
  io(SOCKET_URL, {
    autoConnect: true,
    withCredentials: false,
    auth: async (callback) => {
      try {
        const response = await api.get<{ ticket: string }>('/auth/socket-ticket', { silent: true });
        callback({ ticket: response.data.ticket });
      } catch {
        callback({ ticket: '' });
      }
    },
  });
