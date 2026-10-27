import 'dotenv/config';
import pg from 'pg';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@'))
  throw new Error('Usage: node scripts/promote-admin.mjs email@example.com');
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required. Run from api/.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  const result = await db.query(
    `UPDATE debate_users SET role = 'ADMIN' WHERE email = $1 AND status = 'ACTIVE' RETURNING id, fullname`,
    [email]
  );
  if (!result.rowCount)
    throw new Error(
      'No active account found. Register first; this command does not create accounts or remove restrictions.'
    );
  console.log(
    `Admin access granted to user #${result.rows[0].id}. Log out and log in again.`
  );
} finally {
  await db.end();
}
