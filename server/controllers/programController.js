const db = require('../config/db');

// =============================
// GET ALL PROGRAMS
// =============================
const getAllPrograms = async (req, res) => {
  try {
    const { collegeId } = req.query;
    
    let query = `
      SELECT 
        p.*,
        c.name as college_name,
        c.code as college_code,
        COUNT(DISTINCT ar.id) as alumni_count
      FROM programs p
      LEFT JOIN colleges c ON p.college_id = c.id
      LEFT JOIN alumni_records ar ON p.id = ar.program_id
    `;
    
    const params = [];
    
    if (collegeId && collegeId !== 'all') {
      query += ` WHERE p.college_id = ?`;
      params.push(collegeId);
    }
    
    query += ` GROUP BY p.id ORDER BY c.name ASC, p.name ASC`;
    
    const [programs] = await db.query(query, params);
    res.json(programs);
    
  } catch (error) {
    console.error('Get all programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

// =============================
// GET PROGRAMS BY COLLEGE
// =============================
const getProgramsByCollege = async (req, res) => {
  try {
    const { collegeId } = req.params;
    
    const [programs] = await db.query(
      `SELECT 
        p.*,
        COUNT(DISTINCT ar.id) as alumni_count
       FROM programs p
       LEFT JOIN alumni_records ar ON p.id = ar.program_id
       WHERE p.college_id = ?
       GROUP BY p.id
       ORDER BY p.name ASC`,
      [collegeId]
    );
    
    res.json(programs);
    
  } catch (error) {
    console.error('Get programs by college error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

// =============================
// GET SINGLE PROGRAM
// =============================
const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [programs] = await db.query(
      `SELECT 
        p.*,
        c.name as college_name,
        c.code as college_code,
        COUNT(DISTINCT ar.id) as alumni_count
       FROM programs p
       LEFT JOIN colleges c ON p.college_id = c.id
       LEFT JOIN alumni_records ar ON p.id = ar.program_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id]
    );
    
    if (programs.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    res.json(programs[0]);
    
  } catch (error) {
    console.error('Get program by id error:', error);
    res.status(500).json({ error: 'Failed to fetch program' });
  }
};

// =============================
// CREATE PROGRAM
// =============================
const createProgram = async (req, res) => {
  try {
    const { name, code, college_id, description } = req.body;
    
    // Check if code already exists
    const [existing] = await db.query(
      'SELECT id FROM programs WHERE code = ?',
      [code]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Program code already exists' });
    }
    
    // Check if college exists
    const [college] = await db.query(
      'SELECT id FROM colleges WHERE id = ?',
      [college_id]
    );
    
    if (college.length === 0) {
      return res.status(400).json({ error: 'College not found' });
    }
    
    const [result] = await db.query(
      `INSERT INTO programs (name, code, college_id, description) 
       VALUES (?, ?, ?, ?)`,
      [name, code, college_id, description || null]
    );
    
    const [newProgram] = await db.query(
      `SELECT 
        p.*,
        c.name as college_name,
        c.code as college_code
       FROM programs p
       LEFT JOIN colleges c ON p.college_id = c.id
       WHERE p.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newProgram[0]);
    
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
};

// =============================
// UPDATE PROGRAM
// =============================
const updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, college_id, description } = req.body;
    
    // Check if code already exists (excluding current program)
    const [existing] = await db.query(
      'SELECT id FROM programs WHERE code = ? AND id != ?',
      [code, id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Program code already exists' });
    }
    
    // Check if college exists
    const [college] = await db.query(
      'SELECT id FROM colleges WHERE id = ?',
      [college_id]
    );
    
    if (college.length === 0) {
      return res.status(400).json({ error: 'College not found' });
    }
    
    await db.query(
      `UPDATE programs 
       SET name = ?, code = ?, college_id = ?, description = ?
       WHERE id = ?`,
      [name, code, college_id, description || null, id]
    );
    
    const [updatedProgram] = await db.query(
      `SELECT 
        p.*,
        c.name as college_name,
        c.code as college_code
       FROM programs p
       LEFT JOIN colleges c ON p.college_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    
    res.json(updatedProgram[0]);
    
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Failed to update program' });
  }
};

// =============================
// DELETE PROGRAM
// =============================
const deleteProgram = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if program has alumni records
    const [alumni] = await db.query(
      'SELECT COUNT(*) as count FROM alumni_records WHERE program_id = ?',
      [id]
    );
    
    if (alumni[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete program because it has associated alumni records' 
      });
    }
    
    // Check if program is used in survey questions
    const [surveys] = await db.query(
      'SELECT COUNT(*) as count FROM survey_questions WHERE JSON_CONTAINS(programs, ?)',
      [JSON.stringify(String(id))]
    );
    
    if (surveys[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete program because it is used in survey questions' 
      });
    }
    
    await db.query('DELETE FROM programs WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Program deleted successfully' });
    
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Failed to delete program' });
  }
};

// =============================
// BULK CREATE PROGRAMS
// =============================
const bulkCreatePrograms = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { programs } = req.body;
    
    if (!Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({ error: 'Programs array is required' });
    }
    
    await connection.beginTransaction();
    
    const results = {
      total: programs.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < programs.length; i++) {
      const prog = programs[i];
      
      try {
        // Check if program already exists
        const [existing] = await connection.query(
          'SELECT id FROM programs WHERE code = ?',
          [prog.code]
        );
        
        if (existing.length > 0) {
          // Update existing program
          await connection.query(
            `UPDATE programs 
             SET name = ?, college_id = ?, description = ?
             WHERE code = ?`,
            [prog.name, prog.college_id, prog.description || null, prog.code]
          );
        } else {
          // Insert new program
          await connection.query(
            `INSERT INTO programs (name, code, college_id, description) 
             VALUES (?, ?, ?, ?)`,
            [prog.name, prog.code, prog.college_id, prog.description || null]
          );
        }
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          program: prog,
          error: error.message
        });
      }
    }
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Bulk program operation completed',
      results 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Bulk create programs error:', error);
    res.status(500).json({ error: 'Failed to bulk create programs' });
  } finally {
    connection.release();
  }
};

// =============================
// GET PROGRAM STATISTICS
// =============================
const getProgramStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.code,
        c.name as college_name,
        COUNT(DISTINCT ar.id) as total_alumni,
        SUM(CASE WHEN ar.survey_status = 'completed' THEN 1 ELSE 0 END) as surveys_completed,
        SUM(CASE WHEN ar.status = 'active' THEN 1 ELSE 0 END) as active_accounts,
        COUNT(DISTINCT er.id) as employment_records
      FROM programs p
      LEFT JOIN colleges c ON p.college_id = c.id
      LEFT JOIN alumni_records ar ON p.id = ar.program_id
      LEFT JOIN employment_records er ON ar.student_id = er.student_id
      GROUP BY p.id
      ORDER BY c.name ASC, p.name ASC
    `);
    
    res.json(stats);
    
  } catch (error) {
    console.error('Get program stats error:', error);
    res.status(500).json({ error: 'Failed to fetch program statistics' });
  }
};

module.exports = {
  getAllPrograms,
  getProgramsByCollege,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  bulkCreatePrograms,
  getProgramStats
};