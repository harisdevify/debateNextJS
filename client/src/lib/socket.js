import { io } from 'socket.io-client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8800/api/v1';

// Socket.IO runs on the same server as the API (same origin, same port),
// so by default we just reuse the API origin.
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || new URL(API_URL).origin;

// withCredentials sends the httpOnly auth cookie with the handshake.
export const createSocket = () => io(SOCKET_URL, { withCredentials: true });
