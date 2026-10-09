import getPrisma from '../prisma/db.js';

// Admin middleware - check if user is admin
export const requireAdmin = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'ADMIN') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
};

// Get all pending beta applications
export async function getPendingApplications(c) {
  try {
    const prisma = getPrisma(c.env);
    
    const applications = await prisma.betaApplication.findMany({
      where: {
        status: 'PENDING',
        otpVerified: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    });

    return c.json({
      success: true,
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('[ADMIN] Get pending applications error:', error);
    return c.json({ error: 'Failed to get applications' }, 500);
  }
}

// Get all beta applications (with filters)
export async function getAllApplications(c) {
  try {
    const prisma = getPrisma(c.env);
    const status = c.req.query('status'); // PENDING, APPROVED, REJECTED, REVOKED
    
    const where = status ? { status } : {};
    
    const applications = await prisma.betaApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            profileImage: true,
            isBetaTester: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    });

    return c.json({
      success: true,
      applications,
      count: applications.length
    });
  } catch (error) {
    console.error('[ADMIN] Get all applications error:', error);
    return c.json({ error: 'Failed to get applications' }, 500);
  }
}

// Approve beta application
export async function approveBetaApplication(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { applicationId, notes } = await c.req.json();

    if (!applicationId) {
      return c.json({ error: 'Application ID required' }, 400);
    }

    const application = await prisma.betaApplication.findUnique({
      where: { id: parseInt(applicationId) }
    });

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Update application status
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        reviewedById: adminUser.userId,
        reviewedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        reviewNotes: notes || null
      }
    });

    // Grant beta access to user
    await prisma.user.update({
      where: { id: application.userId },
      data: {
        isBetaTester: true,
        betaAccessGrantedAt: new Date().toISOString()
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId: adminUser.userId,
        action: 'APPROVE_BETA',
        targetType: 'BETA_APPLICATION',
        targetId: application.id,
        details: JSON.stringify({ notes, userId: application.userId })
      }
    });

    return c.json({
      success: true,
      message: 'Beta application approved successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Approve application error:', error);
    return c.json({ error: 'Failed to approve application' }, 500);
  }
}

// Reject beta application
export async function rejectBetaApplication(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { applicationId, reason } = await c.req.json();

    if (!applicationId) {
      return c.json({ error: 'Application ID required' }, 400);
    }

    const application = await prisma.betaApplication.findUnique({
      where: { id: parseInt(applicationId) }
    });

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Update application status
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        status: 'REJECTED',
        reviewedById: adminUser.userId,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reason || 'Application rejected'
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId: adminUser.userId,
        action: 'REJECT_BETA',
        targetType: 'BETA_APPLICATION',
        targetId: application.id,
        details: JSON.stringify({ reason, userId: application.userId })
      }
    });

    return c.json({
      success: true,
      message: 'Beta application rejected'
    });
  } catch (error) {
    console.error('[ADMIN] Reject application error:', error);
    return c.json({ error: 'Failed to reject application' }, 500);
  }
}

// Revoke beta access
export async function revokeBetaAccess(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { userId, reason } = await c.req.json();

    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    // Update user
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        isBetaTester: false,
        betaAccessRevokedAt: new Date().toISOString()
      }
    });

    // Update all user's applications
    await prisma.betaApplication.updateMany({
      where: {
        userId: parseInt(userId),
        status: 'APPROVED'
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        reviewNotes: reason || 'Beta access revoked by admin'
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId: adminUser.userId,
        action: 'REVOKE_BETA',
        targetType: 'USER',
        targetId: parseInt(userId),
        details: JSON.stringify({ reason })
      }
    });

    return c.json({
      success: true,
      message: 'Beta access revoked successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Revoke access error:', error);
    return c.json({ error: 'Failed to revoke access' }, 500);
  }
}

// Get all beta feedback
export async function getAllFeedback(c) {
  try {
    const prisma = getPrisma(c.env);
    const status = c.req.query('status');
    const unreadOnly = c.req.query('unread') === 'true';
    
    const where = {};
    if (status) where.status = status;
    if (unreadOnly) where.isRead = false;
    
    const feedback = await prisma.betaFeedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { submittedAt: 'desc' }
      ]
    });

    return c.json({
      success: true,
      feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('[ADMIN] Get feedback error:', error);
    return c.json({ error: 'Failed to get feedback' }, 500);
  }
}

// Mark feedback as read
export async function markFeedbackRead(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { feedbackId } = await c.req.json();

    await prisma.betaFeedback.update({
      where: { id: parseInt(feedbackId) },
      data: {
        isRead: true,
        readById: adminUser.userId,
        readAt: new Date().toISOString()
      }
    });

    return c.json({
      success: true,
      message: 'Feedback marked as read'
    });
  } catch (error) {
    console.error('[ADMIN] Mark feedback read error:', error);
    return c.json({ error: 'Failed to mark feedback as read' }, 500);
  }
}

// Respond to feedback
export async function respondToFeedback(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { feedbackId, response, newStatus } = await c.req.json();

    await prisma.betaFeedback.update({
      where: { id: parseInt(feedbackId) },
      data: {
        adminResponse: response,
        respondedAt: new Date().toISOString(),
        status: newStatus || 'IN_REVIEW',
        isRead: true,
        readById: adminUser.userId,
        readAt: new Date().toISOString()
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId: adminUser.userId,
        action: 'RESPOND_FEEDBACK',
        targetType: 'BETA_FEEDBACK',
        targetId: parseInt(feedbackId),
        details: JSON.stringify({ response, newStatus })
      }
    });

    return c.json({
      success: true,
      message: 'Response submitted successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Respond to feedback error:', error);
    return c.json({ error: 'Failed to respond to feedback' }, 500);
  }
}

// Get beta program statistics
export async function getBetaStats(c) {
  try {
    const prisma = getPrisma(c.env);

    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      activeBetaTesters,
      totalFeedback,
      unreadFeedback
    ] = await Promise.all([
      prisma.betaApplication.count(),
      prisma.betaApplication.count({ where: { status: 'PENDING', otpVerified: true } }),
      prisma.betaApplication.count({ where: { status: 'APPROVED' } }),
      prisma.betaApplication.count({ where: { status: 'REJECTED' } }),
      prisma.user.count({ where: { isBetaTester: true } }),
      prisma.betaFeedback.count(),
      prisma.betaFeedback.count({ where: { isRead: false } })
    ]);

    return c.json({
      success: true,
      stats: {
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        },
        betaTesters: {
          active: activeBetaTesters
        },
        feedback: {
          total: totalFeedback,
          unread: unreadFeedback
        }
      }
    });
  } catch (error) {
    console.error('[ADMIN] Get stats error:', error);
    return c.json({ error: 'Failed to get statistics' }, 500);
  }
}

// Manage feature flags
export async function updateFeatureFlag(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { featureId, enabledForBeta, enabledForAll } = await c.req.json();

    await prisma.featureFlag.update({
      where: { id: parseInt(featureId) },
      data: {
        enabledForBeta: enabledForBeta ?? undefined,
        enabledForAll: enabledForAll ?? undefined,
        updatedAt: new Date().toISOString()
      }
    });

    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId: adminUser.userId,
        action: 'UPDATE_FEATURE_FLAG',
        targetType: 'FEATURE_FLAG',
        targetId: parseInt(featureId),
        details: JSON.stringify({ enabledForBeta, enabledForAll })
      }
    });

    return c.json({
      success: true,
      message: 'Feature flag updated'
    });
  } catch (error) {
    console.error('[ADMIN] Update feature flag error:', error);
    return c.json({ error: 'Failed to update feature flag' }, 500);
  }
}

// Get all feature flags
export async function getAllFeatureFlags(c) {
  try {
    const prisma = getPrisma(c.env);

    const flags = await prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return c.json({
      success: true,
      flags
    });
  } catch (error) {
    console.error('[ADMIN] Get feature flags error:', error);
    return c.json({ error: 'Failed to get feature flags' }, 500);
  }
}
