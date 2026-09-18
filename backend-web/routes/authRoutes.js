import { Hono } from 'hono';
import { register, login, verifyOTP, resendOTP, forgotPassword, resetPassword, requestEmailChange, confirmEmailChange, logout, getMe } from '../controllers/authController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const auth = new Hono();

auth.post('/register', register);
auth.post('/login', login);
auth.post('/verify-otp', verifyOTP);
auth.post('/resend-otp', resendOTP);
auth.post('/forgot-password', forgotPassword);
auth.post('/reset-password', resetPassword);
auth.post('/request-email-change', authenticateToken, requestEmailChange);
auth.post('/confirm-email-change', authenticateToken, confirmEmailChange);
auth.post('/logout', logout);
auth.get('/me', getMe);

export default auth;
