import { Hono } from 'hono';
import authenticateToken from '../middleware/authMiddleware.js';
import {
  requireAdmin,
  getPendingApplications,
  getAllApplications,
  approveBetaApplication,
  rejectBetaApplication,
  revokeBetaAccess,
  getAllFeedback,
  markFeedbackRead,
  respondToFeedback,
  getBetaStats,
  updateFeatureFlag,
  getAllFeatureFlags
} from '../controllers/adminBetaController.js';

const adminBetaRoutes = new Hono();

// All routes require authentication + admin role
adminBetaRoutes.use('*', authenticateToken, requireAdmin);

// Beta applications management
adminBetaRoutes.get('/applications/pending', getPendingApplications);
adminBetaRoutes.get('/applications', getAllApplications);
adminBetaRoutes.post('/applications/approve', approveBetaApplication);
adminBetaRoutes.post('/applications/reject', rejectBetaApplication);
adminBetaRoutes.post('/revoke-access', revokeBetaAccess);

// Beta feedback management
adminBetaRoutes.get('/feedback', getAllFeedback);
adminBetaRoutes.post('/feedback/read', markFeedbackRead);
adminBetaRoutes.post('/feedback/respond', respondToFeedback);

// Statistics
adminBetaRoutes.get('/stats', getBetaStats);

// Feature flags
adminBetaRoutes.get('/features', getAllFeatureFlags);
adminBetaRoutes.post('/features/update', updateFeatureFlag);

export default adminBetaRoutes;
