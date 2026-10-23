import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'dotenv/config';
import http from 'node:http';
import authRouter from './routes/auth.js';
import { initSocket } from './socket.js';

const server = express();
const port = process.env.PORT || 8800;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
server.use(express.json());
server.use(
  cors({
    origin: clientUrl,
    credentials: true, // allow cookies
  })
);
server.use(cookieParser());

// Routes
server.use('/api/v1/auth', authRouter);

// 404 fallback
server.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// HTTP server shared by Express and Socket.IO (chat + WebRTC signaling)
const httpServer = http.createServer(server);
initSocket(httpServer, clientUrl);

// Start server
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
