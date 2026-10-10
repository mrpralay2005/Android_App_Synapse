import getPrisma from '../prisma/db.js';

/**
 * Create a beta notification for a specific user.
 * Never throws - failures are silently logged.
 */
export async function createBetaNotification(prisma, { userId, type, title, detail, actorName, actorImage, actorUsername }) {
  try {
    await prisma.betaNotification.create({
      data: { userId, type, title, detail, actorName: actorName || null, actorImage: actorImage || null, actorUsername: actorUsername || null }
    });
  } catch (err) {
    console.warn('[BETA-NOTIF] Failed to create notification:', err?.message || err);
  }
}

/**
 * Notify ALL admin users about a beta event.
 */
export async function notifyAllAdmins(prisma, { type, title, detail, actorName, actorImage, actorUsername }) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'admin' }
        ]
      },
      select: { id: true }
    });
    await Promise.all(
      admins.map(admin =>
        createBetaNotification(prisma, { userId: admin.id, type, title, detail, actorName, actorImage, actorUsername })
      )
    );
  } catch (err) {
    console.warn('[BETA-NOTIF] Failed to notify admins:', err?.message || err);
  }
}

