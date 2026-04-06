const db = require('../config/db');

const buildRecipientQuery = ({ targetRole, targetCollegeId, targetProgramId }) => {
  const params = [];
  let query = `
    SELECT DISTINCT u.id
    FROM user u
  `;

  if (targetRole !== 'admin') {
    query += `
      LEFT JOIN alumni_records ar ON ar.student_id = u.username
      LEFT JOIN programs p ON p.id = ar.program_id
    `;
  }

  query += ` WHERE 1=1 `;

  if (targetRole && targetRole !== 'all') {
    query += ` AND u.role = ? `;
    params.push(targetRole);
  }

  if (targetRole !== 'admin') {
    if (targetProgramId) {
      query += ` AND ar.program_id = ? `;
      params.push(targetProgramId);
    } else if (targetCollegeId) {
      query += ` AND p.college_id = ? `;
      params.push(targetCollegeId);
    }
  }

  return { query, params };
};

const createNotification = async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (req.user?.role !== 'admin') {
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

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO notifications
       (title, body, type, target_role, target_college_id, target_program_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        body ? String(body) : null,
        String(type || 'info'),
        String(target_role || 'alumni'),
        target_college_id ? Number(target_college_id) : null,
        target_program_id ? Number(target_program_id) : null,
        req.user.id
      ]
    );

    const notificationId = result.insertId;
    const { query, params } = buildRecipientQuery({
      targetRole: String(target_role || 'alumni'),
      targetCollegeId: target_college_id ? Number(target_college_id) : null,
      targetProgramId: target_program_id ? Number(target_program_id) : null
    });

    const [recipients] = await connection.query(query, params);

    if (recipients.length > 0) {
      const values = recipients.map((r) => [r.id, notificationId]);
      await connection.query(
        `INSERT IGNORE INTO user_notifications (user_id, notification_id) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    return res.status(201).json({
      success: true,
      id: notificationId,
      recipients: recipients.length,
      message: 'Notification created successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create notification error:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  } finally {
    connection.release();
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT
         n.id,
         n.title,
         n.body,
         n.type,
         n.created_at,
         un.read_at
       FROM user_notifications un
       JOIN notifications n ON n.id = un.notification_id
       WHERE un.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [userId]
    );

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      createdAt: r.created_at,
      read: !!r.read_at
    }));

    return res.json(data);
  } catch (error) {
    console.error('Get my notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!notificationId) return res.status(400).json({ error: 'Invalid notification id' });

    const [result] = await db.query(
      `UPDATE user_notifications
       SET read_at = NOW()
       WHERE user_id = ? AND notification_id = ? AND read_at IS NULL`,
      [userId, notificationId]
    );

    return res.json({ success: true, updated: result.affectedRows });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markNotificationRead
};
