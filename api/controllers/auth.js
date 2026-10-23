import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is missing. Set it in your .env file.');
}

const isProduction = process.env.NODE_ENV === 'production';

// One cookie config used for both set & clear so they always match
const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS only in production
  sameSite: isProduction ? 'none' : 'lax',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Never send the password hash to the client
const PUBLIC_FIELDS = 'id, fullname, email, gender, education, country';

export const register = async (req, res) => {
  try {
    // Express 5: req.body is undefined when no body is sent
    const { fullname, email, gender, education, country, password } =
      req.body ?? {};

    if (
      !fullname?.trim() ||
      !email ||
      !gender ||
      !education ||
      !country ||
      !password
    ) {
      return res.status(400).json({ message: 'All fields are required!' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Invalid email address!' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters!' });
    }

    const [data] = await db.query(
      'SELECT id FROM debate_users WHERE email = ?',
      [email]
    );

    if (data.length) {
      return res.status(409).json({ message: 'Email already exists!' });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO debate_users (fullname, email, gender, education, country, password) VALUES (?, ?, ?, ?, ?, ?)',
      [fullname.trim(), email, gender, education, country, hashPassword]
    );

    return res.status(201).json({ message: 'Account created successfully!' });
  } catch (error) {
    console.error('Register Error:', error);
    // never leak internal error details to the client
    return res.status(500).json({ message: 'Something went wrong!' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required!' });
    }

    const [data] = await db.query(
      `SELECT ${PUBLIC_FIELDS}, password FROM debate_users WHERE email = ?`,
      [email]
    );

    // Same message for unknown email and wrong password,
    // so nobody can find out which emails are registered.
    const user = data[0];
    const valid = user && (await bcrypt.compare(password, user.password));

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password!' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });

    const { password: _password, ...publicUser } = user;

    return res
      .cookie('accessToken', token, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // matches the 1d token
      })
      .status(200)
      .json(publicUser);
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Something went wrong!' });
  }
};

// Current user from the httpOnly cookie (set by verifyToken)
export const me = async (req, res) => {
  try {
    const [data] = await db.query(
      `SELECT ${PUBLIC_FIELDS} FROM debate_users WHERE id = ?`,
      [req.userId]
    );

    if (!data.length) {
      return res.status(404).json({ message: 'User not found!' });
    }

    return res.status(200).json(data[0]);
  } catch (error) {
    console.error('Me Error:', error);
    return res.status(500).json({ message: 'Something went wrong!' });
  }
};

export const logout = (req, res) => {
  try {
    res
      .clearCookie('accessToken', cookieOptions)
      .status(200)
      .json({ message: 'Logged out successfully!' });
  } catch (error) {
    console.error('Logout Error:', error);
    return res.status(500).json({ message: 'Something went wrong!' });
  }
};
