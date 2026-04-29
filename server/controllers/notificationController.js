const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { normalizeUserRole, normalizeUserRoleEnum } = require('../utils/refactorAuth');

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    const error = new Error(setupStatus.message);
    error.statusCode = 503;
    throw error;
  }

  return getPrisma();
};

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const VALID_TARGET_ROLES = new Set(['all', 'admin', 'alumni', 'superadmin']);

const normalizeTargetRole = (targetRole) => {
  const normalized = String(targetRole || '').trim().toLowerCase();
  return normalized || 'alumni';
};

const buildRecipientWhere = ({ targetRole, targetCollegeId, targetProgramId }) => {
  const normalizedTargetRole = normalizeTargetRole(targetRole);
  const includeAllRoles = normalizedTargetRole === 'all';
  const where = {};

  if (!includeAllRoles) {
    where.role = normalizeUserRoleEnum(normalizedTargetRole);
  }

  const shouldUseAcademicFilters =
    includeAllRoles || normalizeUserRole(normalizedTargetRole) !== 'admin';

  if (shouldUseAcademicFilters) {
    if (targetProgramId) {
      where.alumni_profile = {
        current_program_id: targetProgramId
      };
    } else if (targetCollegeId) {
      where.alumni_profile = {
        current_program: {
          college_id: targetCollegeId
        }
      };
    }
  }

  return where;
};

const createNotification = async (req, res) => {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create notifications' });
    }

    const {
      title,
      body = null,
      type = 'info',
      target_role = 'alumni',
      target_college_id = null,
      target_program_id = null
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const normalizedTargetRole = normalizeTargetRole(target_role);
    if (!VALID_TARGET_ROLES.has(normalizedTargetRole)) {
      return res.status(400).json({ error: 'Invalid target_role' });
    }

    const targetCollegeId = parseOptionalInt(target_college_id);
    const targetProgramId = parseOptionalInt(target_program_id);

    const result = await refactorPrisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          title: String(title).trim(),
          body: body ? String(body) : null,
          type: String(type || 'info'),
          target_role: normalizedTargetRole,
          target_college_id: targetCollegeId,
          target_program_id: targetProgramId,
          created_by: req.user.id
        }
      });

      const recipientWhere = buildRecipientWhere({
        targetRole: normalizedTargetRole,
        targetCollegeId,
        targetProgramId
      });

      const recipients = await tx.user.findMany({
        where: recipientWhere,
        select: { id: true }
      });

      if (recipients.length > 0) {
        await tx.userNotification.createMany({
          data: recipients.map((recipient) => ({
            user_id: recipient.id,
            notification_id: notification.id
          })),
          skipDuplicates: true
        });
      }

      return {
        id: notification.id,
        recipients: recipients.length
      };
    });

    return res.status(201).json({
      success: true,
      id: result.id,
      recipients: result.recipients,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to create notification' });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const rows = await refactorPrisma.userNotification.findMany({
      where: {
        user_id: userId
      },
      include: {
        notification: true
      },
      orderBy: {
        notification: {
          created_at: 'desc'
        }
      },
      take: 30
    });

    return res.json(
      rows.map((row) => ({
        id: row.notification.id,
        title: row.notification.title,
        body: row.notification.body,
        type: row.notification.type,
        createdAt: row.notification.created_at,
        read: Boolean(row.read_at)
      }))
    );
  } catch (error) {
    console.error('Get my notifications error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to fetch notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = parseOptionalInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!notificationId) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const result = await refactorPrisma.userNotification.updateMany({
      where: {
        user_id: userId,
        notification_id: notificationId,
        read_at: null
      },
      data: {
        read_at: new Date()
      }
    });

    return res.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to mark notification as read' });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationRead
};
