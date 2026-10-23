# Debate — Islamic Discussion Platform

A respectful, moderated platform for Islamic debates with **live video (WebRTC)**, **real-time text chat (Socket.IO)**, and user authentication.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, Axios, Sonner |
| Backend  | Express 5, JWT (httpOnly cookie), bcryptjs, MySQL (mysql2) |
| Realtime | Socket.IO + WebRTC (STUN) |

## Project Structure

```
├── api/                  # Express REST API
│   ├── config/db.js      # MySQL connection (env-based)
│   ├── controllers/      # Route handlers (auth)
│   ├── routes/           # Express routers
│   ├── middleware/       # verifyToken (JWT cookie check)
│   ├── socket.js         # Socket.IO: matchmaking, WebRTC signaling, chat
│   └── app.js            # Server entry point (Express + Socket.IO, same port)
└── client/               # Next.js frontend
    └── src/
        ├── app/          # Routes: /, /login, /register, /profile, /rules, /video
        ├── components/   # Header, Footer, ProtectedRoute
        ├── hooks/        # useAuth, useDebateRoom (matchmaking + WebRTC + chat)
        └── lib/api.js    # Axios instance
```

## Getting Started

### 1. Database (MySQL)

```sql
CREATE DATABASE IF NOT EXISTS debate;
USE debate;

CREATE TABLE IF NOT EXISTS debate_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  gender VARCHAR(20) NOT NULL,
  education VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. API (`api/`)

```bash
cd api
cp .env.example .env        # fill in your DB credentials + JWT secret
npm install
npm run dev                 # http://localhost:8800
```

### 3. Client (`client/`)

```bash
cd client
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

## Environment Variables

**api/.env**
```
PORT=8800
CLIENT_URL=http://localhost:3000
JWT_SECRET=<long-random-string>
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<your-db-password>
DB_NAME=debate
```

**client/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:8800/api/v1
# optional: Socket.IO runs on the API server, so it defaults to the API origin
# NEXT_PUBLIC_SOCKET_URL=http://localhost:8800
```

## Security Notes

- Secrets live in `.env` files only — **never** commit them.
- JWT is stored in an `httpOnly` cookie (not readable by JavaScript).
- Passwords are hashed with bcrypt (cost 10).
- All SQL queries are parameterized.
- If a secret was ever committed to git, rotate it and purge history:
  ```bash
  git rm -r --cached api/node_modules
  git filter-repo --path api/config/db.js --invert-paths   # or use BFG
  ```

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `api/` | `npm run dev` | Start API with nodemon |
| `api/` | `npm start` | Start API (production) |
| `client/` | `npm run dev` | Next.js dev server |
| `client/` | `npm run build` | Production build |

---

Developed by **M Haris**
