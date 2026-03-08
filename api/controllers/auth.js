import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
export const register = async (req, res) => {
  try {
    //check user email if exist
    const [data] = await db.query('SELECT * FROM debate_users WHERE email=?', [
      req.body.email,
    ]);

    if (data.length) return res.status(409).json('Email already exist!');

    //creating hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(req.body.password, salt);

    const values = [
      req.body.fullname,
      req.body.email,
      req.body.gender,
      req.body.education,
      req.body.country,
      hashPassword,
    ];

    await db.query(
      'INSERT INTO debate_users (fullname, email, gender, education, country, password) VALUES (?)',
      [values]
    );

    return res.status(200).json('Account created successfully!');
  } catch (error) {
    console.error('Signup Error:', error); // This will print the real error
    return res
      .status(500)
      .json({ message: 'Something went wrong!', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    //validation
    if (!req.body.email || !req.body.password)
      return res.status(400).json('All fields are required!');

    //check user if exist
    const [data] = await db.query('SELECT * FROM debate_users WHERE email=?', [
      req.body.email,
    ]);

    if (data.length === 0) return res.status(409).json('Account not found!');

    //compare password
    const checkPassword = bcrypt.compareSync(
      req.body.password,
      data[0].password
    );

    if (!checkPassword) return res.status(400).json('Wrong password!');

    const token = jwt.sign({ id: data[0].id }, 'seqretkey', {
      expiresIn: '1d',
    });
    const { password, ...others } = data[0];

    return res
      .cookie('accessToken', token, {
        httpOnly: true,
      })
      .status(200)
      .json(others);
  } catch (error) {
    console.error('Signup Error:', error); // This will print the real error
    return res
      .status(500)
      .json({ message: 'Something went wrong!', error: error.message });
  }
};
export const logout = (req, res) => {
  try {
    res
      .clearCookie('accessToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      })
      .status(200)
      .json('Logout Successfully!');
  } catch (error) {
    console.error('Signup Error:', error); // This will print the real error
    return res
      .status(500)
      .json({ message: 'Something went wrong!', error: error.message });
  }
};
