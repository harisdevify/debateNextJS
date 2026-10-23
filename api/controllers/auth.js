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

export const register = async (req, res) => {
  try {
    const { fullname, email, gender, education, country, password } = req.body;

    // validation
    if (
      !fullname ||
      !email ||
      !gender ||
      !education ||
      !country ||
      !password
    ) {
      return res.status(400).json({ message: 'All fields are required!' });
    }

    // check if email already exists
    const [data] = await db.query(
      'SELECT id FROM debate_users WHERE email = ?',
      [email]
    );

    if (data.length) {
      return res.status(409).json({ message: 'Email already exists!' });
    }

    // hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);

    await db.query(
      'INSERT INTO debate_users (fullname, email, gender, education, country, password) VALUES (?)',
      [[fullname, email, gender, education, country, hashPassword]]
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
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required!' });
    }

    // check user
    const [data] = await db.query(
      'SELECT * FROM debate_users WHERE email = ?',
      [email]
    );

    if (data.length === 0) {
      return res.status(404).json({ message: 'Account not found!' });
    }

    // compare password
    const checkPassword = bcrypt.compareSync(password, data[0].password);

    if (!checkPassword) {
      return res.status(401).json({ message: 'Wrong password!' });
    }

    const token = jwt.sign({ id: data[0].id }, JWT_SECRET, {
      expiresIn: '1d',
    });

    // remove password before sending the user object back
    const { password: _password, ...others } = data[0];

    return res
      .cookie('accessToken', token, cookieOptions)
      .status(200)
      .json(others);
  } catch (error) {
    console.error('Login Error:', error);
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
