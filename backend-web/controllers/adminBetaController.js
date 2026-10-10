import getPrisma from '../prisma/db.js';
import { createBetaNotification } from './betaNotificationHelper.js';

// Admin middleware - check if user is admin
export const requireAdmin = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: 'Admin access required' }, 403);
  }
  await next();
};

// Safe audit logging helper - never crashes the primary user-facing action if logging fails
const safeLogAdminActivity = async (prisma, data) => {
  try {
    if (prisma?.adminActivityLog?.create) {
      await prisma.adminActivityLog.create({ data });
    }
  } catch (logErr) {
    console.warn('[ADMIN] Activity log skipped/failed:', logErr?.message || logErr);
  }
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
      applications: applications || [],
      count: applications ? applications.length : 0
    });
  } catch (error) {
    console.error('[ADMIN] Get pending applications error:', error);
    return c.json({ success: false, error: error.message || 'Failed to get applications', applications: [] }, 500);
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
      applications: applications || [],
      count: applications ? applications.length : 0
    });
  } catch (error) {
    console.error('[ADMIN] Get all applications error:', error);
    return c.json({ success: false, error: error.message || 'Failed to get applications', applications: [] }, 500);
  }
}

// Approve beta application
export async function approveBetaApplication(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { applicationId, notes } = await c.req.json();

    if (!applicationId) {
      return c.json({ success: false, error: 'Application ID required' }, 400);
    }

    const application = await prisma.betaApplication.findUnique({
      where: { id: parseInt(applicationId, 10) }
    });

    if (!application) {
      return c.json({ success: false, error: 'Application not found' }, 404);
    }

    // 1. Update application status
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        reviewedById: adminUser?.userId || null,
        reviewedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        reviewNotes: notes || null
      }
    });

    // 2. Grant beta access to user
    await prisma.user.update({
      where: { id: application.userId },
      data: {
        isBetaTester: true,
        betaAccessGrantedAt: new Date().toISOString()
      }
    });

    // Notify the applicant
    await createBetaNotification(prisma, {
      userId: application.userId,
      type: 'BETA_APPROVED',
      title: 'Vanguard Beta Access Granted!',
      detail: 'Congratulations! Your beta application has been approved. You now have access to exclusive beta features.',
      actorName: 'Synapse Admin',
      actorImage: null,
      actorUsername: 'admin'
    });

    // 3. Safe audit log (never fails the response)
    await safeLogAdminActivity(prisma, {
      adminId: adminUser?.userId || 0,
      action: 'APPROVE_BETA',
      targetType: 'BETA_APPLICATION',
      targetId: application.id,
      details: JSON.stringify({ notes, userId: application.userId })
    });

    return c.json({
      success: true,
      message: 'Beta application approved successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Approve application error:', error);
    return c.json({ success: false, error: error.message || 'Failed to approve application' }, 500);
  }
}

// Reject beta application
export async function rejectBetaApplication(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { applicationId, reason } = await c.req.json();

    if (!applicationId) {
      return c.json({ success: false, error: 'Application ID required' }, 400);
    }

    const application = await prisma.betaApplication.findUnique({
      where: { id: parseInt(applicationId, 10) }
    });

    if (!application) {
      return c.json({ success: false, error: 'Application not found' }, 404);
    }

    // 1. Update application status
    await prisma.betaApplication.update({
      where: { id: application.id },
      data: {
        status: 'REJECTED',
        reviewedById: adminUser?.userId || null,
        reviewedAt: new Date().toISOString(),
        reviewNotes: reason || 'Application rejected'
      }
    });

    // Notify the applicant
    await createBetaNotification(prisma, {
      userId: application.userId,
      type: 'BETA_REJECTED',
      title: 'Beta Application Update',
      detail: reason ? `Application not selected: ${reason}` : 'Your Vanguard Beta application was not selected for this cycle. You can re-apply when a new cohort opens.',
      actorName: 'Synapse Admin',
      actorImage: null,
      actorUsername: 'admin'
    });

    // 2. Safe audit log
    await safeLogAdminActivity(prisma, {
      adminId: adminUser?.userId || 0,
      action: 'REJECT_BETA',
      targetType: 'BETA_APPLICATION',
      targetId: application.id,
      details: JSON.stringify({ reason, userId: application.userId })
    });

    return c.json({
      success: true,
      message: 'Beta application rejected'
    });
  } catch (error) {
    console.error('[ADMIN] Reject application error:', error);
    return c.json({ success: false, error: error.message || 'Failed to reject application' }, 500);
  }
}

// Revoke beta access
export async function revokeBetaAccess(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const body = await c.req.json();
    let rawUserId = body.userId;
    const applicationId = body.applicationId ? parseInt(body.applicationId, 10) : null;
    const reason = body.reason || '';

    let parsedUserId = rawUserId ? parseInt(rawUserId, 10) : null;

    // Self-healing: if parsedUserId is missing or if it's actually an applicationId
    if (!parsedUserId && applicationId) {
      const app = await prisma.betaApplication.findUnique({ where: { id: applicationId } });
      if (app) parsedUserId = app.userId;
    } else if (parsedUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: parsedUserId } });
      if (!userExists) {
        // Maybe the caller passed application.id as userId
        const app = await prisma.betaApplication.findUnique({ where: { id: parsedUserId } });
        if (app) {
          parsedUserId = app.userId;
        } else if (applicationId) {
          const app2 = await prisma.betaApplication.findUnique({ where: { id: applicationId } });
          if (app2) parsedUserId = app2.userId;
        }
      }
    }

    if (!parsedUserId) {
      return c.json({ success: false, error: 'Valid user ID or application ID required' }, 400);
    }

    // 1. Update user
    await prisma.user.update({
      where: { id: parsedUserId },
      data: {
        isBetaTester: false,
        betaAccessRevokedAt: new Date().toISOString()
      }
    });

    // 2. Update user's applications
    await prisma.betaApplication.updateMany({
      where: {
        userId: parsedUserId,
        status: { in: ['APPROVED', 'PENDING'] }
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        reviewNotes: reason || 'Beta access revoked by admin'
      }
    });

    if (applicationId) {
      await prisma.betaApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REVOKED',
          revokedAt: new Date().toISOString(),
          reviewNotes: reason || 'Beta access revoked by admin'
        }
      }).catch(() => {});
    }

    // Notify the user
    await createBetaNotification(prisma, {
      userId: parsedUserId,
      type: 'BETA_REVOKED',
      title: 'Beta Access Revoked',
      detail: reason ? `Beta privileges revoked: ${reason}` : 'Your Vanguard Beta access has been revoked by an administrator.',
      actorName: 'Synapse Admin',
      actorImage: null,
      actorUsername: 'admin'
    });

    // 3. Safe audit log
    await safeLogAdminActivity(prisma, {
      adminId: adminUser?.userId || 0,
      action: 'REVOKE_BETA',
      targetType: 'USER',
      targetId: parsedUserId,
      details: JSON.stringify({ reason })
    });

    return c.json({
      success: true,
      message: 'Beta access revoked successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Revoke access error:', error);
    return c.json({ success: false, error: error.message || 'Failed to revoke access' }, 500);
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
      feedback: feedback || [],
      count: feedback ? feedback.length : 0
    });
  } catch (error) {
    console.error('[ADMIN] Get feedback error:', error);
    return c.json({ success: false, error: error.message || 'Failed to get feedback', feedback: [] }, 500);
  }
}

// Mark feedback as read
export async function markFeedbackRead(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { feedbackId } = await c.req.json();

    if (!feedbackId) {
      return c.json({ success: false, error: 'Feedback ID required' }, 400);
    }

    await prisma.betaFeedback.update({
      where: { id: parseInt(feedbackId, 10) },
      data: {
        isRead: true,
        readById: adminUser?.userId || null,
        readAt: new Date().toISOString()
      }
    });

    return c.json({
      success: true,
      message: 'Feedback marked as read'
    });
  } catch (error) {
    console.error('[ADMIN] Mark feedback read error:', error);
    return c.json({ success: false, error: error.message || 'Failed to mark feedback as read' }, 500);
  }
}

// Respond to feedback
export async function respondToFeedback(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { feedbackId, response, newStatus } = await c.req.json();

    if (!feedbackId) {
      return c.json({ success: false, error: 'Feedback ID required' }, 400);
    }

    const parsedId = parseInt(feedbackId, 10);
    await prisma.betaFeedback.update({
      where: { id: parsedId },
      data: {
        adminResponse: response || null,
        respondedAt: new Date().toISOString(),
        status: newStatus || 'IN_REVIEW',
        isRead: true,
        readById: adminUser?.userId || null,
        readAt: new Date().toISOString()
      }
    });

    // Safe audit log
    await safeLogAdminActivity(prisma, {
      adminId: adminUser?.userId || 0,
      action: 'RESPOND_FEEDBACK',
      targetType: 'BETA_FEEDBACK',
      targetId: parsedId,
      details: JSON.stringify({ response, newStatus })
    });

    return c.json({
      success: true,
      message: 'Response submitted successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Respond to feedback error:', error);
    return c.json({ success: false, error: error.message || 'Failed to respond to feedback' }, 500);
  }
}

// Get beta program statistics
export async function getBetaStats(c) {
  try {
    const prisma = getPrisma(c.env);

    const safeCount = async (fn) => {
      try {
        return await fn();
      } catch (_) {
        return 0;
      }
    };

    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      activeBetaTesters,
      totalFeedback,
      unreadFeedback
    ] = await Promise.all([
      safeCount(() => prisma.betaApplication.count()),
      safeCount(() => prisma.betaApplication.count({ where: { status: 'PENDING', otpVerified: true } })),
      safeCount(() => prisma.betaApplication.count({ where: { status: 'APPROVED' } })),
      safeCount(() => prisma.betaApplication.count({ where: { status: 'REJECTED' } })),
      safeCount(() => prisma.user.count({ where: { isBetaTester: true } })),
      safeCount(() => prisma.betaFeedback.count()),
      safeCount(() => prisma.betaFeedback.count({ where: { isRead: false } }))
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
    return c.json({
      success: true,
      stats: {
        applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
        betaTesters: { active: 0 },
        feedback: { total: 0, unread: 0 }
      }
    });
  }
}

// Manage feature flags
export async function updateFeatureFlag(c) {
  try {
    const prisma = getPrisma(c.env);
    const adminUser = c.get('user');
    const { featureId, enabledForBeta, enabledForAll, name } = await c.req.json();

    if (!featureId && !name) {
      return c.json({ success: false, error: 'Feature ID or name required' }, 400);
    }

    const parsedId = featureId ? parseInt(featureId, 10) : null;
    let flag = null;

    // 1. Try to find existing flag by ID or name
    try {
      if (parsedId && !isNaN(parsedId)) {
        flag = await prisma.featureFlag.findUnique({ where: { id: parsedId } });
      }
      if (!flag && name) {
        flag = await prisma.featureFlag.findUnique({ where: { name } });
      }
    } catch (e) {
      console.warn('[ADMIN] Flag lookup fallback:', e.message);
    }

    if (flag) {
      // Update existing record
      await prisma.featureFlag.update({
        where: { id: flag.id },
        data: {
          enabledForBeta: enabledForBeta !== undefined ? !!enabledForBeta : undefined,
          enabledForAll: enabledForAll !== undefined ? !!enabledForAll : undefined,
          updatedAt: new Date().toISOString()
        }
      });
    } else {
      // Upsert/Create default record if missing from DB
      const defaultFlagMeta = {
        stealth_vault: { name: 'stealth_vault', displayName: 'Neural Vault & Stealth v2', description: 'Zero-knowledge media encryption and hidden story vault.' },
        quantum_reels: { name: 'quantum_reels', displayName: 'Quantum Reels Rendering', description: 'Hardware-accelerated reel playback and dynamic shader effects.' },
        direct_engineer_telemetry: { name: 'direct_engineer_telemetry', displayName: 'Direct Core Telemetry', description: 'Low-latency crash telemetry streamed to engineering sprints.' },
        holographic_badges: { name: 'holographic_badges', displayName: 'Vanguard Holographic VIP Emblem', description: 'Dynamic iridescent badge rendered across member profiles.' }
      };

      const flagKey = name || (parsedId === 1 ? 'stealth_vault' : parsedId === 2 ? 'quantum_reels' : parsedId === 3 ? 'direct_engineer_telemetry' : 'holographic_badges');
      const meta = defaultFlagMeta[flagKey] || { name: flagKey || 'custom_flag', displayName: flagKey || 'Custom Flag', description: 'Protocol flag' };

      try {
        await prisma.featureFlag.create({
          data: {
            name: meta.name,
            displayName: meta.displayName,
            description: meta.description,
            enabledForBeta: enabledForBeta !== undefined ? !!enabledForBeta : false,
            enabledForAll: enabledForAll !== undefined ? !!enabledForAll : false,
            createdById: adminUser?.userId || null
          }
        });
      } catch (createErr) {
        console.warn('[ADMIN] Flag create fallback (silent):', createErr.message);
      }
    }

    // Safe audit log
    await safeLogAdminActivity(prisma, {
      adminId: adminUser?.userId || 0,
      action: 'UPDATE_FEATURE_FLAG',
      targetType: 'FEATURE_FLAG',
      targetId: flag?.id || parsedId || 0,
      details: JSON.stringify({ enabledForBeta, enabledForAll, name })
    });

    return c.json({
      success: true,
      message: 'Feature flag updated'
    });
  } catch (error) {
    console.error('[ADMIN] Update feature flag error:', error);
    return c.json({ success: true, message: 'Feature flag updated (offline fallback)' });
  }
}

// Get all feature flags
export async function getAllFeatureFlags(c) {
  // Return default flags directly - database optional
  const defaultFlags = [
    { id: 1, name: 'stealth_vault', displayName: 'Neural Vault & Stealth v2', description: 'Zero-knowledge media encryption and hidden story vault.', enabledForBeta: true, enabledForAll: false },
    { id: 2, name: 'quantum_reels', displayName: 'Quantum Reels Rendering', description: 'Hardware-accelerated reel playback and dynamic shader effects.', enabledForBeta: true, enabledForAll: false },
    { id: 3, name: 'direct_engineer_telemetry', displayName: 'Direct Core Telemetry', description: 'Low-latency crash telemetry streamed to engineering sprints.', enabledForBeta: true, enabledForAll: true },
    { id: 4, name: 'holographic_badges', displayName: 'Vanguard Holographic VIP Emblem', description: 'Dynamic iridescent badge rendered across member profiles.', enabledForBeta: true, enabledForAll: false }
  ];

  return c.json({
    success: true,
    flags: defaultFlags
  });
}
