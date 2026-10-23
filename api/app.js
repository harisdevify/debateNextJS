import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import 'dotenv/config';
import authRouter from './routes/auth.js';

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

// Start server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
