const db = require('../config/db');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const writeAuditLog = async (connectionOrDb, { userId, action, entityType, entityId = null, metadata = null }) => {
  const meta = metadata ? JSON.stringify(metadata) : null;
  await connectionOrDb.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, action, entityType, entityId, meta]
  );
};

const listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const params = [];
    let where = '';

    if (role && role !== 'all') {
      where = 'WHERE role = ?';
      params.push(role);
    }

    const [rows] = await db.query(
      `SELECT id, username, email, role, first_name, last_name, last_login
       FROM user
       ${where}
       ORDER BY role ASC, last_name ASC, first_name ASC, username ASC
       LIMIT 2000`,
      params
    );

    return res.json(rows);
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Failed to list users' });
  }
};

const createAdmin = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { username, email, password, firstName, lastName } = req.body || {};

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'username, email, password, firstName, lastName are required' });
    }

    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id FROM user WHERE username = ? OR email = ? LIMIT 1`,
      [String(username).trim(), String(email).trim().toLowerCase()]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await connection.query(
      `INSERT INTO user (username, email, password_hash, role, first_name, last_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(username).trim(),
        String(email).trim().toLowerCase(),
        passwordHash,
        'admin',
        String(firstName).trim(),
        String(lastName).trim()
      ]
    );

    await writeAuditLog(connection, {
      userId: req.user.id,
      action: 'create_admin',
      entityType: 'user',
      entityId: result.insertId,
      metadata: { username, email, role: 'admin' }
    });

    await connection.commit();
    return res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('Create admin error:', error);
    return res.status(500).json({ error: 'Failed to create admin' });
  } finally {
    connection.release();
  }
};

const updateUserRole = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.params.id);
    const { role } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (!role || !['admin', 'alumni'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    await connection.beginTransaction();

    const [users] = await connection.query(`SELECT id, username, role FROM user WHERE id = ? LIMIT 1`, [userId]);
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const prevRole = users[0].role;
    if (prevRole === 'superadmin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Superadmin role cannot be changed' });
    }
    if (prevRole === 'alumni' && role === 'admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Alumni accounts cannot be promoted to admin' });
    }
    await connection.query(`UPDATE user SET role = ? WHERE id = ?`, [role, userId]);

    await writeAuditLog(connection, {
      userId: req.user.id,
      action: 'update_user_role',
      entityType: 'user',
      entityId: userId,
      metadata: { username: users[0].username, from: prevRole, to: role }
    });

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Update user role error:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  } finally {
    connection.release();
  }
};

const removeAdmin = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (userId === req.user.id) return res.status(400).json({ error: 'You cannot remove your own account' });

    await connection.beginTransaction();

    const [users] = await connection.query(
      `SELECT id, username, role FROM user WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const target = users[0];
    if (target.role === 'superadmin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Superadmin account cannot be removed' });
    }

    await connection.query(`DELETE FROM user WHERE id = ?`, [userId]);

    await writeAuditLog(connection, {
      userId: req.user.id,
      action: 'remove_user',
      entityType: 'user',
      entityId: userId,
      metadata: { username: target.username, role: target.role }
    });

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Remove admin error:', error);
    return res.status(500).json({ error: 'Failed to remove admin' });
  } finally {
    connection.release();
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const { userId, action, entityType, limit = 100 } = req.query;
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const params = [];
    const wheres = [];

    if (userId) {
      wheres.push('al.user_id = ?');
      params.push(Number(userId));
    }
    if (action) {
      wheres.push('al.action = ?');
      params.push(String(action));
    }
    if (entityType) {
      wheres.push('al.entity_type = ?');
      params.push(String(entityType));
    }

    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
         al.id,
         al.user_id,
         u.username,
         u.role,
         al.action,
         al.entity_type,
         al.entity_id,
         al.metadata,
         al.created_at
       FROM audit_logs al
       LEFT JOIN user u ON u.id = al.user_id
       ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT ${lim}`,
      params
    );

    return res.json(rows);
  } catch (error) {
    console.error('List audit logs error:', error);
    return res.status(500).json({ error: 'Failed to list audit logs' });
  }
};

const getSetting = async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ error: 'Invalid key' });

    const [rows] = await db.query(`SELECT \`key\`, value, updated_by, updated_at FROM system_settings WHERE \`key\` = ? LIMIT 1`, [key]);
    if (rows.length === 0) return res.status(404).json({ error: 'Setting not found' });

    return res.json(rows[0]);
  } catch (error) {
    console.error('Get setting error:', error);
    return res.status(500).json({ error: 'Failed to get setting' });
  }
};

const getPublicSetting = async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ error: 'Invalid key' });

    const allowedPublicKeys = new Set(['system_branding']);
    if (!allowedPublicKeys.has(key)) {
      return res.status(403).json({ error: 'Setting is not publicly accessible' });
    }

    const [rows] = await db.query(`SELECT \`key\`, value, updated_by, updated_at FROM system_settings WHERE \`key\` = ? LIMIT 1`, [key]);
    if (rows.length === 0) return res.status(404).json({ error: 'Setting not found' });

    return res.json(rows[0]);
  } catch (error) {
    console.error('Get public setting error:', error);
    return res.status(500).json({ error: 'Failed to get setting' });
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
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extension) ? extension : '.png';
    const filename = `logo-${Date.now()}${safeExt}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);

    return res.json({
      success: true,
      logoUrl: `/uploads/logos/${filename}`
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return res.status(500).json({ error: 'Failed to upload logo' });
  }
};

const upsertSetting = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const key = String(req.params.key || '').trim();
    const { value } = req.body || {};
    if (!key) return res.status(400).json({ error: 'Invalid key' });
    if (value === undefined) return res.status(400).json({ error: 'value is required' });

    const jsonValue = JSON.stringify(value);

    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO system_settings (\`key\`, value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
      [key, jsonValue, req.user.id]
    );

    await writeAuditLog(connection, {
      userId: req.user.id,
      action: 'upsert_setting',
      entityType: 'system_setting',
      entityId: null,
      metadata: { key }
    });

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Upsert setting error:', error);
    return res.status(500).json({ error: 'Failed to save setting' });
  } finally {
    connection.release();
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

