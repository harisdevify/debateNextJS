import 'dotenv/config';
import mysql from 'mysql2/promise';

const {
  DB_HOST,
  DB_PORT = '3306',
  DB_USER,
  DB_PASSWORD = '',
  DB_NAME,
} = process.env;

if (!DB_HOST || !DB_USER || !DB_NAME) {
  throw new Error('Missing database configuration. Check your .env file.');
}

export const db = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
});
