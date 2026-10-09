import getPrisma from '../prisma/db.js';
import crypto from 'crypto';

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Submit beta program application
export async function submitBetaApplication(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;

    const {
      fullName,
      email,
      address,
      age,
      gender,
      reasonForJoining,
      motivation
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !reasonForJoining || !motivation) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fullName', 'email', 'reasonForJoining', 'motivation']
      });
    }

    // Check if user already has a pending or approved application
    const existingApplication = await prisma.betaApplication.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingApplication) {
      return res.status(400).json({ 
        error: 'You already have an active beta application',
        status: existingApplication.status
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create application
    const application = await prisma.betaApplication.create({
      data: {
        userId,
        fullName,
        email,
        address,
        age: age ? parseInt(age) : null,
        gender,
        reasonForJoining,
        motivation,
        otpCode,
        otpExpires: otpExpires.toISOString(),
        status: 'PENDING',
        otpVerified: false
      }
    });

    // TODO: Send OTP via email (integrate with your email service)
    console.log(`[BETA] OTP for ${email}: ${otpCode}`);

    return res.json({
      success: true,
      message: 'Application submitted. Please verify your OTP.',
      applicationId: application.id,
      otpSent: true
    });

  } catch (error) {
    console.error('[BETA] Submit application error:', error);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}

// Verify OTP for beta application
export async function verifyBetaOTP(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;
    const { applicationId, otpCode } = req.body;

    if (!applicationId || !otpCode) {
      return res.status(400).json({ error: 'Application ID and OTP required' });
    }

    // Find application
    const application = await prisma.betaApplication.findFirst({
      where: {
        id: parseInt(applicationId),
        userId
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.otpVerified) {
      return res.status(400).json({ error: 'OTP already verified' });
    }

    // Check OTP expiry
    if (new Date(application.otpExpires) < new Date()) {
      return res.status(400).json({ error: 'OTP expired', expired: true });
    }

    // Verify OTP
    if (application.otpCode !== otpCode) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark as verified
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        otpVerified: true,
        otpVerifiedAt: new Date().toISOString()
      }
    });

    return res.json({
      success: true,
      message: 'OTP verified successfully. Your application is under review.',
      verified: true
    });

  } catch (error) {
    console.error('[BETA] Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}

// Resend OTP
export async function resendBetaOTP(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;
    const { applicationId } = req.body;

    const application = await prisma.betaApplication.findFirst({
      where: {
        id: parseInt(applicationId),
        userId
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.otpVerified) {
      return res.status(400).json({ error: 'OTP already verified' });
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        otpCode,
        otpExpires: otpExpires.toISOString()
      }
    });

    // TODO: Send OTP via email
    console.log(`[BETA] New OTP for ${application.email}: ${otpCode}`);

    return res.json({
      success: true,
      message: 'OTP resent successfully',
      otpSent: true
    });

  } catch (error) {
    console.error('[BETA] Resend OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
}

// Get user's beta status
export async function getBetaStatus(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isBetaTester: true,
        betaAccessGrantedAt: true,
        betaAccessRevokedAt: true
      }
    });

    // Get latest application
    const application = await prisma.betaApplication.findFirst({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
      select: {
        id: true,
        status: true,
        otpVerified: true,
        appliedAt: true,
        approvedAt: true,
        reviewNotes: true
      }
    });

    return res.json({
      success: true,
      isBetaTester: user.isBetaTester,
      betaAccessGrantedAt: user.betaAccessGrantedAt,
      betaAccessRevokedAt: user.betaAccessRevokedAt,
      application: application || null
    });

  } catch (error) {
    console.error('[BETA] Get status error:', error);
    return res.status(500).json({ error: 'Failed to get beta status' });
  }
}

// Submit beta feedback
export async function submitBetaFeedback(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;

    // Check if user is beta tester
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBetaTester: true }
    });

    if (!user.isBetaTester) {
      return res.status(403).json({ error: 'Only beta testers can submit feedback' });
    }

    const { featureName, rating, title, description, screenshots } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }

    // Create feedback
    const feedback = await prisma.betaFeedback.create({
      data: {
        userId,
        featureName,
        rating: rating ? parseInt(rating) : null,
        title,
        description,
        screenshots: screenshots ? JSON.stringify(screenshots) : null,
        status: 'SUBMITTED',
        priority: 'MEDIUM'
      }
    });

    return res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id
    });

  } catch (error) {
    console.error('[BETA] Submit feedback error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

// Get beta features for current user
export async function getBetaFeatures(req, res) {
  try {
    const prisma = getPrisma(req.env);
    const userId = req.user.userId;

    // Check if user is beta tester
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBetaTester: true }
    });

    // Get features based on user status
    const features = await prisma.featureFlag.findMany({
      where: user.isBetaTester
        ? { enabledForBeta: true }
        : { enabledForAll: true },
      select: {
        name: true,
        displayName: true,
        description: true,
        enabledForBeta: true,
        enabledForAll: true
      }
    });

    return res.json({
      success: true,
      isBetaTester: user.isBetaTester,
      features
    });

  } catch (error) {
    console.error('[BETA] Get features error:', error);
    return res.status(500).json({ error: 'Failed to get features' });
  }
}
