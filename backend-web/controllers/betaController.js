import getPrisma from '../prisma/db.js';
import { sendOTP } from '../utils/email.js';
import { notifyAllAdmins } from './betaNotificationHelper.js';

const OTP_LIFETIME_MS = 10 * 60 * 1000;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getBody = async (c) => {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
};

const normalizeText = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const getAuthenticatedUser = async (prisma, c) => {
  const userId = c.get('user')?.userId;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isBetaTester: true,
      betaAccessGrantedAt: true,
      betaAccessRevokedAt: true
    }
  });
};

// POST /api/beta/apply
export async function submitBetaApplication(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    const body = await getBody(c);
    const fullName = normalizeText(body.fullName, 120);
    const reasonForJoining = normalizeText(body.reasonForJoining, 2000);
    const motivation = normalizeText(body.motivation, 2000);
    const address = normalizeText(body.address, 300) || null;
    const gender = normalizeText(body.gender, 40) || null;
    const suppliedEmail = normalizeText(body.email, 254).toLowerCase();
    const accountEmail = user.email.trim().toLowerCase();
    const parsedAge = body.age === '' || body.age === undefined || body.age === null
      ? null
      : Number.parseInt(body.age, 10);

    if (!fullName || !reasonForJoining || !motivation) {
      return c.json({
        success: false,
        error: 'Full name, reason for joining, and motivation are required.'
      }, 400);
    }

    if (suppliedEmail && suppliedEmail !== accountEmail) {
      return c.json({
        success: false,
        error: 'Use the verified email address on your SynapseX account for beta verification.'
      }, 400);
    }

    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 13 || parsedAge > 120)) {
      return c.json({ success: false, error: 'Enter a valid age.' }, 400);
    }

    const existingApplication = await prisma.betaApplication.findFirst({
      where: { userId: user.id, status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { appliedAt: 'desc' }
    });

    if (existingApplication) {
      return c.json({
        success: false,
        error: 'You already have an active beta application.',
        status: existingApplication.status
      }, 409);
    }

    const otpCode = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_LIFETIME_MS);
    const application = await prisma.betaApplication.create({
      data: {
        userId: user.id,
        fullName,
        email: accountEmail,
        address,
        age: parsedAge,
        gender,
        reasonForJoining,
        motivation,
        otpCode,
        otpExpires,
        status: 'PENDING',
        otpVerified: false
      }
    });

    const otpSent = await sendOTP(accountEmail, otpCode, c.env);
    if (!otpSent) {
      return c.json({
        success: false,
        applicationId: application.id,
        error: 'Your application was saved, but we could not deliver the verification code. Please use Resend OTP in a moment.'
      }, 502);
    }

    // Notify all admins about the new beta application submission
    notifyAllAdmins(prisma, {
      type: 'BETA_APPLICATION_RECEIVED',
      title: `${fullName || user.name || user.username} requested for Beta Program`,
      detail: `@${user.username} submitted a beta application. Check status in the Admin Beta Panel.`,
      actorName: fullName || user.name || null,
      actorImage: user.profileImage || null,
      actorUsername: user.username || null
    }).catch(() => {});

    return c.json({
      success: true,
      message: 'Application submitted. Check your account email for the verification code.',
      applicationId: application.id,
      otpSent: true
    }, 201);
  } catch (error) {
    console.error('[BETA] Submit application error:', error);
    return c.json({ success: false, error: 'Failed to submit beta application.' }, 500);
  }
}

// POST /api/beta/verify-otp
export async function verifyBetaOTP(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    const body = await getBody(c);
    const applicationId = Number.parseInt(body.applicationId, 10);
    const otpCode = normalizeText(body.otpCode, 6);
    if (!Number.isInteger(applicationId) || !/^\d{6}$/.test(otpCode)) {
      return c.json({ success: false, error: 'A valid application and six-digit code are required.' }, 400);
    }

    const application = await prisma.betaApplication.findFirst({
      where: { id: applicationId, userId: user.id }
    });
    if (!application) return c.json({ success: false, error: 'Application not found.' }, 404);
    if (application.otpVerified) return c.json({ success: false, error: 'This application is already verified.' }, 409);
    if (!application.otpExpires || application.otpExpires < new Date()) {
      return c.json({ success: false, error: 'The verification code expired. Request a new code.', expired: true }, 400);
    }
    if (application.otpCode !== otpCode) {
      return c.json({ success: false, error: 'That verification code is not correct.' }, 400);
    }

    await prisma.betaApplication.update({
      where: { id: application.id },
      data: { otpVerified: true, otpVerifiedAt: new Date(), otpCode: null, otpExpires: null }
    });

    // Notify all admins about the new verified beta application
    const applicant = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, name: true, profileImage: true }
    });
    await notifyAllAdmins(prisma, {
      type: 'BETA_APPLICATION_RECEIVED',
      title: `${applicant?.name || applicant?.username || 'A user'} applied for Vanguard Beta`,
      detail: 'New beta application verified and awaiting your review.',
      actorName: applicant?.name || null,
      actorImage: applicant?.profileImage || null,
      actorUsername: applicant?.username || null
    });

    return c.json({
      success: true,
      message: 'Email verified. Your beta application is now under review.',
      verified: true
    });
  } catch (error) {
    console.error('[BETA] Verify OTP error:', error);
    return c.json({ success: false, error: 'Failed to verify the code.' }, 500);
  }
}

// POST /api/beta/resend-otp
export async function resendBetaOTP(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    const body = await getBody(c);
    const applicationId = Number.parseInt(body.applicationId, 10);
    if (!Number.isInteger(applicationId)) {
      return c.json({ success: false, error: 'Application ID is required.' }, 400);
    }

    const application = await prisma.betaApplication.findFirst({
      where: { id: applicationId, userId: user.id }
    });
    if (!application) return c.json({ success: false, error: 'Application not found.' }, 404);
    if (application.otpVerified) return c.json({ success: false, error: 'This application is already verified.' }, 409);

    const otpCode = generateOTP();
    const accountEmail = user.email.trim().toLowerCase();
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: { email: accountEmail, otpCode, otpExpires: new Date(Date.now() + OTP_LIFETIME_MS) }
    });

    const otpSent = await sendOTP(accountEmail, otpCode, c.env);
    if (!otpSent) {
      return c.json({ success: false, error: 'We could not deliver the verification code. Please try again shortly.' }, 502);
    }

    return c.json({ success: true, message: 'A new verification code was sent.', otpSent: true });
  } catch (error) {
    console.error('[BETA] Resend OTP error:', error);
    return c.json({ success: false, error: 'Failed to resend the verification code.' }, 500);
  }
}

// GET /api/beta/status
export async function getBetaStatus(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    const application = await prisma.betaApplication.findFirst({
      where: { userId: user.id },
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

    return c.json({
      success: true,
      email: user.email,
      name: user.name || '',
      isBetaTester: user.isBetaTester,
      betaAccessGrantedAt: user.betaAccessGrantedAt,
      betaAccessRevokedAt: user.betaAccessRevokedAt,
      application: application || null
    });
  } catch (error) {
    console.error('[BETA] Get status error:', error);
    return c.json({ success: false, error: 'Failed to load beta status.' }, 500);
  }
}

// POST /api/beta/feedback
export async function submitBetaFeedback(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    let isBetaApproved = user.isBetaTester;
    if (!isBetaApproved) {
      const approvedApp = await prisma.betaApplication.findFirst({
        where: { userId: user.id, status: 'APPROVED' }
      });
      if (approvedApp) {
        isBetaApproved = true;
        await prisma.user.update({
          where: { id: user.id },
          data: { isBetaTester: true }
        }).catch(() => {});
      }
    }

    if (!isBetaApproved) return c.json({ success: false, error: 'Only approved beta testers can submit feedback.' }, 403);

    const body = await getBody(c);
    const featureName = normalizeText(body.featureName, 120) || null;
    const title = normalizeText(body.title, 160);
    const description = normalizeText(body.description, 5000);
    const rating = body.rating === '' || body.rating === undefined || body.rating === null
      ? null
      : Number.parseInt(body.rating, 10);

    if (!title || !description) return c.json({ success: false, error: 'A title and description are required.' }, 400);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return c.json({ success: false, error: 'Rating must be between 1 and 5.' }, 400);
    }

    const screenshots = Array.isArray(body.screenshots) ? body.screenshots.slice(0, 8) : null;
    const feedback = await prisma.betaFeedback.create({
      data: {
        userId: user.id,
        featureName,
        rating,
        title,
        description,
        screenshots: screenshots ? JSON.stringify(screenshots) : null,
        status: 'SUBMITTED',
        priority: 'MEDIUM'
      }
    });

    return c.json({ success: true, message: 'Feedback submitted. Thank you!', feedbackId: feedback.id }, 201);
  } catch (error) {
    console.error('[BETA] Submit feedback error:', error);
    return c.json({ success: false, error: error.message || 'Failed to submit feedback.' }, 500);
  }
}

// GET /api/beta/features
export async function getBetaFeatures(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    const features = await prisma.featureFlag.findMany({
      where: user.isBetaTester
        ? { OR: [{ enabledForBeta: true }, { enabledForAll: true }] }
        : { enabledForAll: true },
      select: {
        name: true,
        displayName: true,
        description: true,
        enabledForBeta: true,
        enabledForAll: true
      },
      orderBy: { displayName: 'asc' }
    });

    return c.json({ success: true, isBetaTester: user.isBetaTester, features });
  } catch (error) {
    console.error('[BETA] Get features error:', error);
    return c.json({ success: false, error: 'Failed to load beta features.' }, 500);
  }
}

// GET /api/beta/my-feedback - Get user's own feedback with admin responses
export async function getMyFeedback(c) {
  try {
    const prisma = getPrisma(c.env);
    const user = await getAuthenticatedUser(prisma, c);
    if (!user) return c.json({ success: false, error: 'Account not found' }, 404);

    let isBetaApproved = user.isBetaTester;
    if (!isBetaApproved) {
      const approvedApp = await prisma.betaApplication.findFirst({
        where: { userId: user.id, status: 'APPROVED' }
      });
      if (approvedApp) {
        isBetaApproved = true;
        await prisma.user.update({
          where: { id: user.id },
          data: { isBetaTester: true }
        }).catch(() => {});
      }
    }

    if (!isBetaApproved) return c.json({ success: false, error: 'Only beta testers can view feedback.' }, 403);

    const feedback = await prisma.betaFeedback.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        featureName: true,
        rating: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        isRead: true,
        adminResponse: true,
        respondedAt: true,
        submittedAt: true
      }
    });

    return c.json({ success: true, feedback });
  } catch (error) {
    console.error('[BETA] Get my feedback error:', error);
    return c.json({ success: false, error: error.message || 'Failed to load feedback.' }, 500);
  }
}
