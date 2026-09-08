import { Hono } from 'hono';
import { register, login, verifyOTP, forgotPassword, resetPassword, logout, getMe } from '../controllers/authController.js';

const auth = new Hono();

auth.post('/register', register);
auth.post('/login', login);
auth.post('/verify-otp', verifyOTP);
auth.post('/forgot-password', forgotPassword);
auth.post('/reset-password', resetPassword);
auth.post('/logout', logout);
auth.get('/me', getMe);

export default auth;
