import { Hono } from 'hono';
import { getProfile, updateProfile, getSavedItems, getSuggestedUsers, getResonance, recordProfileVisit, getAnalytics, toggleFollow, exportArchive, purgeActivity } from '../controllers/userController.js';
import { getLatestPlatformUpdate } from '../controllers/adminController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const user = new Hono();

user.get('/profile/:username', authenticateToken, getProfile);
user.post('/profile/:username/visit', authenticateToken, recordProfileVisit);
user.post('/profile/:username/follow', authenticateToken, toggleFollow);
user.get('/analytics', authenticateToken, getAnalytics);
user.get('/saved', authenticateToken, getSavedItems);
user.get('/archive/export', authenticateToken, exportArchive);
user.post('/archive/purge-activity', authenticateToken, purgeActivity);
user.get('/suggested', getSuggestedUsers);
user.get('/resonance/:username', authenticateToken, getResonance);
user.get('/platform-update/latest', getLatestPlatformUpdate);
user.put('/update', authenticateToken, updateProfile);

export default user;
