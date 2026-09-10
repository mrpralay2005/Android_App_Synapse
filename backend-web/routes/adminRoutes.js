import { Hono } from 'hono';
import { getAllUsers, getAdminOverview, getCreatorRequests, reviewCreatorRequest, getPlatformUpdates, publishPlatformUpdate } from '../controllers/adminController.js';
import authenticateToken from '../middleware/authMiddleware.js';

const admin = new Hono();

admin.get('/users', authenticateToken, getAllUsers);
admin.get('/overview', authenticateToken, getAdminOverview);
admin.get('/creator-requests', authenticateToken, getCreatorRequests);
admin.put('/creator-requests/:id', authenticateToken, reviewCreatorRequest);
admin.get('/platform-updates', authenticateToken, getPlatformUpdates);
admin.post('/platform-updates', authenticateToken, publishPlatformUpdate);

export default admin;
