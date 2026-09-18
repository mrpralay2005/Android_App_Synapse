import { Hono } from 'hono';
import { getProfile, updateProfile, getSavedItems, getSuggestedUsers, getResonance } from '../controllers/userController.js';
import { getLatestPlatformUpdate } from '../controllers/adminController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const user = new Hono();

user.get('/profile/:username', getProfile);
user.get('/saved', authenticateToken, getSavedItems);
user.get('/suggested', getSuggestedUsers);
user.get('/resonance/:username', authenticateToken, getResonance);
user.get('/platform-update/latest', getLatestPlatformUpdate);
user.put('/update', authenticateToken, updateProfile);

export default user;
