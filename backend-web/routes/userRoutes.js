import { Hono } from 'hono';
import { getProfile, updateProfile, getSavedItems, getSuggestedUsers, getResonance, recordProfileVisit, getAnalytics, toggleFollow, respondToFollowRequest } from '../controllers/userController.js';
import { getLatestPlatformUpdate } from '../controllers/adminController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const user = new Hono();

user.get('/profile/:username', authenticateToken, getProfile);
user.post('/profile/:username/visit', authenticateToken, recordProfileVisit);
user.post('/profile/:username/follow', authenticateToken, toggleFollow);
user.post('/follow-requests/:id/respond', authenticateToken, respondToFollowRequest);
user.get('/analytics', authenticateToken, getAnalytics);
user.get('/saved', authenticateToken, getSavedItems);
user.get('/suggested', getSuggestedUsers);
user.get('/resonance/:username', authenticateToken, getResonance);
user.get('/platform-update/latest', getLatestPlatformUpdate);
user.put('/update', authenticateToken, updateProfile);

export default user;
