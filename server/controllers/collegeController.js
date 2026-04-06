const db = require('../config/db');

// Get all colleges with program counts
const getColleges = async (req, res) => {
  try {
    const [colleges] = await db.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as program_count,
        COUNT(ar.id) as alumni_count
      FROM colleges c
      LEFT JOIN programs p ON c.id = p.college_id
      LEFT JOIN alumni_records ar ON p.id = ar.program_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(colleges);
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({ error: 'Failed to fetch colleges' });
  }
};

// Get single college by ID with programs
const getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [colleges] = await db.query(
      'SELECT * FROM colleges WHERE id = ?',
      [id]
    );
    
    if (colleges.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }
    
    // Get programs under this college
    const [programs] = await db.query(
      `SELECT 
        p.*,
        COUNT(ar.id) as alumni_count
       FROM programs p
       LEFT JOIN alumni_records ar ON p.id = ar.program_id
       WHERE p.college_id = ?
       GROUP BY p.id
       ORDER BY p.name ASC`,
      [id]
    );
    
    res.json({
      ...colleges[0],
      programs
    });
  } catch (error) {
    console.error('Get college error:', error);
    res.status(500).json({ error: 'Failed to fetch college' });
  }
};

// Add new college
const addCollege = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    // Check if code already exists
    const [existing] = await db.query(
      'SELECT id FROM colleges WHERE code = ?',
      [code]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'College code already exists' });
    }
    
    const [result] = await db.query(
      'INSERT INTO colleges (name, code, description) VALUES (?, ?, ?)',
      [name, code, description]
    );
    
    const [newCollege] = await db.query(
      'SELECT * FROM colleges WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newCollege[0]);
  } catch (error) {
    console.error('Add college error:', error);
    res.status(500).json({ error: 'Failed to add college' });
  }
};

// Update college
const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    // Check if code already exists (excluding current college)
    const [existing] = await db.query(
      'SELECT id FROM colleges WHERE code = ? AND id != ?',
      [code, id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'College code already exists' });
    }
    
    await db.query(
      'UPDATE colleges SET name = ?, code = ?, description = ? WHERE id = ?',
      [name, code, description, id]
    );
    
    res.json({ success: true, message: 'College updated successfully' });
  } catch (error) {
    console.error('Update college error:', error);
    res.status(500).json({ error: 'Failed to update college' });
  }
};

// Delete college (only if no programs or surveys)
const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if college has programs
    const [programs] = await db.query(
      'SELECT COUNT(*) as count FROM programs WHERE college_id = ?',
      [id]
    );
    
    if (programs[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete college because it has associated programs' 
      });
    }
    
    // Check if college is used in survey questions
    const [usage] = await db.query(
      'SELECT COUNT(*) as count FROM survey_questions WHERE JSON_CONTAINS(colleges, ?)',
      [JSON.stringify(String(id))]
    );
    
    if (usage[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete college because it is being used in survey questions' 
      });
    }
    
    await db.query('DELETE FROM colleges WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    console.error('Delete college error:', error);
    res.status(500).json({ error: 'Failed to delete college' });
  }
};

// Get college statistics
const getCollegeStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.code,
        COUNT(DISTINCT p.id) as total_programs,
        COUNT(DISTINCT ar.id) as total_alumni,
        SUM(CASE WHEN ar.survey_status = 'completed' THEN 1 ELSE 0 END) as surveys_completed,
        SUM(CASE WHEN ar.status = 'active' THEN 1 ELSE 0 END) as active_accounts
      FROM colleges c
      LEFT JOIN programs p ON c.id = p.college_id
      LEFT JOIN alumni_records ar ON p.id = ar.program_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Get college stats error:', error);
    res.status(500).json({ error: 'Failed to fetch college statistics' });
  }
};

module.exports = {
  getColleges,
  getCollegeById,
  addCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats
};