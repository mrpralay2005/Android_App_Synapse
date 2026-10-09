import { Hono } from 'hono';
import authenticateToken from '../middleware/authMiddleware.js';
import {
  submitBetaApplication,
  verifyBetaOTP,
  resendBetaOTP,
  getBetaStatus,
  submitBetaFeedback,
  getBetaFeatures
} from '../controllers/betaController.js';

const betaRoutes = new Hono();

// Beta application routes
betaRoutes.post('/apply', authenticateToken, submitBetaApplication);
betaRoutes.post('/verify-otp', authenticateToken, verifyBetaOTP);
betaRoutes.post('/resend-otp', authenticateToken, resendBetaOTP);
betaRoutes.get('/status', authenticateToken, getBetaStatus);

// Beta feedback routes
betaRoutes.post('/feedback', authenticateToken, submitBetaFeedback);

// Beta features
betaRoutes.get('/features', authenticateToken, getBetaFeatures);

export default betaRoutes;
