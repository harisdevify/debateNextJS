import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { db } from './config/db.js';

const MAX_CHAT_LENGTH = 1000;

// The auth cookie is httpOnly, so the browser sends it with the socket
// handshake automatically (client uses withCredentials: true).
const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const i = part.indexOf('=');
        return [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
      })
  );

export function initSocket(httpServer, clientUrl) {
  const io = new Server(httpServer, {
    cors: { origin: clientUrl, credentials: true },
  });

  // Socket ids of users waiting for a partner (FIFO)
  const queue = [];

  /* ── only logged-in users can connect ── */
  io.use(async (socket, next) => {
    try {
      const { accessToken } = parseCookies(socket.handshake.headers.cookie);
      if (!accessToken) return next(new Error('Not authenticated'));

      const { id } = jwt.verify(accessToken, process.env.JWT_SECRET);
      const [rows] = await db.query(
        'SELECT id, fullname FROM debate_users WHERE id = ?',
        [id]
      );
      if (!rows.length) return next(new Error('Not authenticated'));

      socket.data.user = rows[0];
      socket.data.peerId = null;
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  const removeFromQueue = (socketId) => {
    const i = queue.indexOf(socketId);
    if (i !== -1) queue.splice(i, 1);
  };

  // Leave the queue and/or the current 1-to-1 debate, telling the partner.
  const leaveDebate = (socket) => {
    removeFromQueue(socket.id);

    const peerId = socket.data.peerId;
    if (!peerId) return;
    socket.data.peerId = null;

    const peer = io.sockets.sockets.get(peerId);
    if (peer && peer.data.peerId === socket.id) {
      peer.data.peerId = null;
      peer.emit('peer-left');
    }
  };

  io.on('connection', (socket) => {
    /* ── matchmaking: pair with the longest-waiting other user ── */
    socket.on('find-partner', () => {
      leaveDebate(socket);

      let partner = null;
      for (let i = 0; i < queue.length; i++) {
        const candidate = io.sockets.sockets.get(queue[i]);
        if (!candidate) {
          queue.splice(i--, 1); // stale entry
          continue;
        }
        // never match someone with themselves (e.g. two open tabs)
        if (candidate.data.user.id !== socket.data.user.id) {
          partner = candidate;
          queue.splice(i, 1);
          break;
        }
      }

      if (!partner) {
        queue.push(socket.id);
        socket.emit('waiting');
        return;
      }

      socket.data.peerId = partner.id;
      partner.data.peerId = socket.id;

      // the one who waited makes the WebRTC offer (avoids offer "glare")
      partner.emit('matched', {
        initiator: true,
        peer: { fullname: socket.data.user.fullname },
      });
      socket.emit('matched', {
        initiator: false,
        peer: { fullname: partner.data.user.fullname },
      });
    });

    /* ── WebRTC signaling: only ever relayed to the current partner ── */
    ['offer', 'answer', 'ice-candidate'].forEach((event) => {
      socket.on(event, (payload) => {
        const peerId = socket.data.peerId;
        if (peerId) io.to(peerId).emit(event, payload);
      });
    });

    /* ── chat ── */
    socket.on('chatMessage', (text) => {
      const peerId = socket.data.peerId;
      if (!peerId || typeof text !== 'string') return;

      const clean = text.trim().slice(0, MAX_CHAT_LENGTH);
      if (!clean) return;

      io.to(peerId).emit('chatMessage', { text: clean });
    });

    socket.on('leave', () => leaveDebate(socket));
    socket.on('disconnect', () => leaveDebate(socket));
  });

  return io;
}
