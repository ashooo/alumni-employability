const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { getPrisma, getDatabaseSetupStatus } = require('../config/db');
const { normalizeUserRole, normalizeUserRoleEnum } = require('../utils/refactorAuth');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireRefactorPrisma = () => {
  const setupStatus = getDatabaseSetupStatus();

  if (!setupStatus.ready) {
    throw createHttpError(503, setupStatus.message);
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

const normalizeString = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const writeAuditLog = async (
  prismaClient,
  { userId, action, entityType, entityId = null, metadata = null }
) => {
  await prismaClient.auditLog.create({
    data: {
      user_id: userId || null,
      action: String(action),
      entity_type: entityType ? String(entityType) : null,
      entity_id: entityId === null || entityId === undefined ? null : Number(entityId),
      metadata: metadata || null
    }
  });
};

const deleteAlumniProfileData = async (tx, profileId) => {
  const snapshots = await tx.academicSnapshot.findMany({
    where: { alumni_profile_id: profileId },
    select: { id: true }
  });
  const snapshotIds = snapshots.map((row) => row.id);

  const submissions = await tx.surveySubmission.findMany({
    where: { alumni_profile_id: profileId },
    select: { id: true }
  });
  const submissionIds = submissions.map((row) => row.id);

  if (submissionIds.length > 0) {
    await tx.followupSchedule.deleteMany({
      where: {
        OR: [
          { trigger_submission_id: { in: submissionIds } },
          { alumni_profile_id: profileId }
        ]
      }
    });

    await tx.mlPrediction.deleteMany({
      where: {
        OR: [
          { alumni_profile_id: profileId },
          { submission_id: { in: submissionIds } },
          ...(snapshotIds.length > 0
            ? [{ academic_snapshot_id: { in: snapshotIds } }]
            : [])
        ]
      }
    });

    await tx.employmentOutcome.deleteMany({
      where: {
        OR: [
          { alumni_profile_id: profileId },
          { submission_id: { in: submissionIds } }
        ]
      }
    });

    await tx.submissionCompetency.deleteMany({
      where: {
        submission_id: {
          in: submissionIds
        }
      }
    });

    await tx.surveyAnswer.deleteMany({
      where: {
        submission_id: {
          in: submissionIds
        }
      }
    });

    await tx.surveySubmission.updateMany({
      where: {
        parent_submission_id: {
          in: submissionIds
        }
      },
      data: {
        parent_submission_id: null
      }
    });

    await tx.surveySubmission.updateMany({
      where: {
        trigger_submission_id: {
          in: submissionIds
        }
      },
      data: {
        trigger_submission_id: null
      }
    });

    await tx.surveySubmission.deleteMany({
      where: {
        id: {
          in: submissionIds
        }
      }
    });
  } else {
    await tx.followupSchedule.deleteMany({
      where: {
        alumni_profile_id: profileId
      }
    });

    await tx.employmentOutcome.deleteMany({
      where: {
        alumni_profile_id: profileId
      }
    });

    await tx.mlPrediction.deleteMany({
      where: {
        alumni_profile_id: profileId
      }
    });
  }

  if (snapshotIds.length > 0) {
    await tx.mlPrediction.deleteMany({
      where: {
        academic_snapshot_id: {
          in: snapshotIds
        }
      }
    });
  }

  await tx.academicSnapshot.deleteMany({
    where: {
      alumni_profile_id: profileId
    }
  });

  await tx.alumniProfile.delete({
    where: {
      id: profileId
    }
  });
};

const listUsers = async (req, res) => {
  try {
    const roleParam = normalizeString(req.query?.role).toLowerCase();
    if (roleParam && roleParam !== 'all' && !['admin', 'alumni', 'superadmin'].includes(roleParam)) {
      return res.status(400).json({ error: 'Invalid role filter' });
    }

    const where =
      roleParam && roleParam !== 'all'
        ? { role: normalizeUserRoleEnum(roleParam) }
        : undefined;

    const refactorPrisma = requireRefactorPrisma();
    const rows = await refactorPrisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        last_login: true
      },
      orderBy: [
        { role: 'asc' },
        { last_name: 'asc' },
        { first_name: 'asc' },
        { username: 'asc' }
      ],
      take: 2000
    });

    return res.json(
      rows.map((row) => ({
        ...row,
        role: normalizeUserRole(row.role)
      }))
    );
  } catch (error) {
    console.error('List users error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to list users' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const username = normalizeString(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const firstName = normalizeString(req.body?.firstName);
    const lastName = normalizeString(req.body?.lastName);

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'username, email, password, firstName, lastName are required'
      });
    }

    const refactorPrisma = requireRefactorPrisma();
    const result = await refactorPrisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        },
        select: { id: true }
      });

      if (existing) {
        throw createHttpError(400, 'Username or email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const created = await tx.user.create({
        data: {
          username,
          email,
          password_hash: passwordHash,
          role: 'ADMIN',
          first_name: firstName,
          last_name: lastName
        }
      });

      await writeAuditLog(tx, {
        userId: req.user.id,
        action: 'create_admin',
        entityType: 'user',
        entityId: created.id,
        metadata: { username, email, role: 'admin' }
      });

      return created;
    });

    return res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Create admin error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to create admin' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = parseOptionalInt(req.params.id);
    const role = normalizeString(req.body?.role).toLowerCase();

    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (!role || !['admin', 'alumni'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const refactorPrisma = requireRefactorPrisma();
    await refactorPrisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          role: true
        }
      });

      if (!user) {
        throw createHttpError(404, 'User not found');
      }

      const previousRole = normalizeUserRole(user.role);
      if (previousRole === 'superadmin') {
        throw createHttpError(403, 'Superadmin role cannot be changed');
      }

      if (previousRole === 'alumni' && role === 'admin') {
        throw createHttpError(403, 'Alumni accounts cannot be promoted to admin');
      }

      await tx.user.update({
        where: {
          id: userId
        },
        data: {
          role: normalizeUserRoleEnum(role)
        }
      });

      await writeAuditLog(tx, {
        userId: req.user.id,
        action: 'update_user_role',
        entityType: 'user',
        entityId: userId,
        metadata: { username: user.username, from: previousRole, to: role }
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update role' });
  }
};

const removeAdmin = async (req, res) => {
  try {
    const userId = parseOptionalInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }

    const refactorPrisma = requireRefactorPrisma();
    await refactorPrisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        include: {
          alumni_profile: {
            select: { id: true }
          }
        }
      });

      if (!target) {
        throw createHttpError(404, 'User not found');
      }

      const role = normalizeUserRole(target.role);
      if (role === 'superadmin') {
        throw createHttpError(403, 'Superadmin account cannot be removed');
      }

      await tx.userNotification.deleteMany({
        where: {
          user_id: userId
        }
      });

      if (target.alumni_profile) {
        await deleteAlumniProfileData(tx, target.alumni_profile.id);
      }

      await tx.auditLog.updateMany({
        where: {
          user_id: userId
        },
        data: {
          user_id: null
        }
      });

      await tx.systemSetting.updateMany({
        where: {
          updated_by: userId
        },
        data: {
          updated_by: null
        }
      });

      await tx.notification.updateMany({
        where: {
          created_by: userId
        },
        data: {
          created_by: null
        }
      });

      await tx.importHistory.updateMany({
        where: {
          uploaded_by: userId
        },
        data: {
          uploaded_by: null
        }
      });

      await tx.user.delete({
        where: {
          id: userId
        }
      });

      await writeAuditLog(tx, {
        userId: req.user.id,
        action: 'remove_user',
        entityType: 'user',
        entityId: userId,
        metadata: { username: target.username, role }
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Remove admin error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to remove admin' });
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const limitParam = parseOptionalInt(req.query?.limit);
    const limit = Math.min(Math.max(limitParam || 100, 1), 500);
    const userId = parseOptionalInt(req.query?.userId);
    const action = normalizeString(req.query?.action);
    const entityType = normalizeString(req.query?.entityType);

    const where = {
      ...(userId ? { user_id: userId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entity_type: entityType } : {})
    };

    const refactorPrisma = requireRefactorPrisma();
    const rows = await refactorPrisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    return res.json(
      rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        username: row.user?.username || null,
        role: row.user?.role ? normalizeUserRole(row.user.role) : null,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        metadata: row.metadata,
        created_at: row.created_at
      }))
    );
  } catch (error) {
    console.error('List audit logs error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to list audit logs' });
  }
};

const getSetting = async (req, res) => {
  try {
    const key = normalizeString(req.params.key);
    if (!key) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const setting = await refactorPrisma.systemSetting.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    return res.json(setting);
  } catch (error) {
    console.error('Get setting error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to get setting' });
  }
};

const getPublicSetting = async (req, res) => {
  try {
    const key = normalizeString(req.params.key);
    if (!key) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const allowedPublicKeys = new Set(['system_branding']);
    if (!allowedPublicKeys.has(key)) {
      return res.status(403).json({ error: 'Setting is not publicly accessible' });
    }

    const refactorPrisma = requireRefactorPrisma();
    const setting = await refactorPrisma.systemSetting.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    return res.json(setting);
  } catch (error) {
    console.error('Get public setting error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to get setting' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const uploadsDir = path.resolve(__dirname, '../../public/uploads/logos');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const extension = path.extname(req.file.originalname || '').toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extension)
      ? extension
      : '.png';
    const filename = `logo-${Date.now()}${safeExt}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    return res.json({
      success: true,
      logoUrl: `/uploads/logos/${filename}`
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to upload logo' });
  }
};

const upsertSetting = async (req, res) => {
  try {
    const key = normalizeString(req.params.key);
    const value = req.body?.value;

    if (!key) {
      return res.status(400).json({ error: 'Invalid key' });
    }

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' });
    }

    const serializedValue = JSON.stringify(value);
    const refactorPrisma = requireRefactorPrisma();

    await refactorPrisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key },
        update: {
          value: serializedValue,
          updated_by: req.user.id
        },
        create: {
          key,
          value: serializedValue,
          updated_by: req.user.id
        }
      });

      await writeAuditLog(tx, {
        userId: req.user.id,
        action: 'upsert_setting',
        entityType: 'system_setting',
        metadata: { key }
      });
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Upsert setting error:', error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to save setting' });
  }
};

module.exports = {
  listUsers,
  createAdmin,
  updateUserRole,
  removeAdmin,
  listAuditLogs,
  getPublicSetting,
  getSetting,
  upsertSetting,
  uploadLogo
};
