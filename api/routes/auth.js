import express from 'express';
import { login, logout, me, register, updateMe } from '../controllers/auth.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, me);
router.patch('/me', verifyToken, updateMe);

export default router;
