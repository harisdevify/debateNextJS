import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import authRouter from './routes/auth.js';

const server = express();
const port = 8800;

// Middleware
server.use(express.json());
server.use(
  cors({
    origin: 'http://localhost:3000', // frontend
    credentials: true, // allow cookies
  })
);
server.use(cookieParser());

// Routes
server.use('/api/v1/auth', authRouter);

// Start server
server.listen(port, () => {
  console.log(`server is running on ${port}`);
});
