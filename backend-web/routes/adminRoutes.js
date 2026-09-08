import { Hono } from 'hono';
import { getAllUsers } from '../controllers/adminController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const admin = new Hono();

admin.get('/users', authenticateToken, getAllUsers);

export default admin;
