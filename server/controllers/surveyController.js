const db = require('../config/db');

// =============================
// GET SURVEY (Admin Builder)
// =============================
const getSurvey = async (req, res) => {
  try {
    const version = parseInt(req.query.version) || 1;
    const collegeId = req.query.college;

    const [categories] = await db.query(
      `SELECT * FROM survey_categories ORDER BY order_index ASC`
    );

    const result = [];

    for (const cat of categories) {

      let query = `
        SELECT * FROM survey_questions
        WHERE category_id = ? AND version = ?
      `;

      const params = [cat.id, version];

      if (collegeId && collegeId !== 'all') {
        query += ` AND (colleges IS NULL OR colleges = '[]' OR JSON_CONTAINS(colleges, ?))`;
        params.push(JSON.stringify(collegeId));
      }

      query += ` ORDER BY order_index ASC`;

      const [questions] = await db.query(query, params);

      const parsed = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
        colleges: q.colleges ? JSON.parse(q.colleges) : [],
        programs: q.programs ? JSON.parse(q.programs) : []
      }));

      result.push({
        ...cat,
        questions: parsed
      });

    }

    res.json({ categories: result });

  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
};

// =============================
// GET SURVEY VERSIONS
// =============================
const getVersions = async (req, res) => {
  try {

    const [versions] = await db.query(
      `SELECT DISTINCT version FROM survey_questions ORDER BY version DESC`
    );

    res.json({
      versions: versions.map(v => v.version)
    });

  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
};

// =============================
// SAVE SURVEY
// =============================
const saveSurvey = async (req, res) => {

  const connection = await db.getConnection();

  try {

    const { version, categories } = req.body;

    await connection.beginTransaction();

    for (const cat of categories) {

      if (cat.id) {

        await connection.query(
          `UPDATE survey_categories
           SET name=?, description=?, order_index=?
           WHERE id=?`,
          [cat.name, cat.description || null, cat.order_index, cat.id]
        );

      } else {

        const [result] = await connection.query(
          `INSERT INTO survey_categories (name, description, order_index)
           VALUES (?, ?, ?)`,
          [cat.name, cat.description || null, cat.order_index]
        );

        cat.id = result.insertId;

      }

      for (const q of cat.questions) {

        if (q.id) {

          await connection.query(
            `UPDATE survey_questions
             SET text=?, type=?, required=?, options=?,
                 scale_min=?, scale_max=?, order_index=?, colleges=?, programs=?
             WHERE id=?`,
            [
              q.text,
              q.type,
              q.required ? 1 : 0,
              q.options && q.options.length > 0 ? JSON.stringify(q.options) : null,
              q.scale_min || null,
              q.scale_max || null,
              q.order_index,
              q.colleges && q.colleges.length > 0 ? JSON.stringify(q.colleges) : null,
              q.programs && q.programs.length > 0 ? JSON.stringify(q.programs) : null,
              q.id
            ]
          );

        } else {

          await connection.query(
            `INSERT INTO survey_questions
            (category_id, text, type, required, options, scale_min, scale_max, order_index, version, colleges, programs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cat.id,
              q.text,
              q.type,
              q.required ? 1 : 0,
              q.options && q.options.length > 0 ? JSON.stringify(q.options) : null,
              q.scale_min || null,
              q.scale_max || null,
              q.order_index,
              version,
              q.colleges && q.colleges.length > 0 ? JSON.stringify(q.colleges) : null,
              q.programs && q.programs.length > 0 ? JSON.stringify(q.programs) : null
            ]
          );

        }

      }

    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Survey saved successfully'
    });

  } catch (error) {

    await connection.rollback();

    console.error('Save survey error:', error);

    res.status(500).json({
      error: 'Failed to save survey'
    });

  } finally {
    connection.release();
  }

};

// =============================
// CREATE VERSION
// =============================
const createVersion = async (req, res) => {

  const connection = await db.getConnection();

  try {

    const newVersion = parseInt(req.params.version);
    const { categories } = req.body;

    await connection.beginTransaction();

    for (const cat of categories) {

      for (const q of cat.questions) {

        await connection.query(
          `INSERT INTO survey_questions
           (category_id, text, type, required, options, scale_min, scale_max, order_index, version, colleges, programs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cat.id,
            q.text,
            q.type,
            q.required ? 1 : 0,
            q.options && q.options.length > 0 ? JSON.stringify(q.options) : null,
            q.scale_min || null,
            q.scale_max || null,
            q.order_index,
            newVersion,
            q.colleges && q.colleges.length > 0 ? JSON.stringify(q.colleges) : null,
            q.programs && q.programs.length > 0 ? JSON.stringify(q.programs) : null
          ]
        );

      }

    }

    await connection.commit();

    res.json({
      success: true,
      message: `Version ${newVersion} created`
    });

  } catch (error) {

    await connection.rollback();

    console.error('Create version error:', error);

    res.status(500).json({
      error: 'Failed to create version'
    });

  } finally {
    connection.release();
  }

};

// =============================
// ADD CATEGORY
// =============================
const addCategory = async (req, res) => {

  try {

    const { name, description, order_index } = req.body;

    const [result] = await db.query(
      `INSERT INTO survey_categories
       (name, description, order_index)
       VALUES (?, ?, ?)`,
      [name, description || null, order_index]
    );

    const [newCategory] = await db.query(
      `SELECT * FROM survey_categories WHERE id=?`,
      [result.insertId]
    );

    res.status(201).json(newCategory[0]);

  } catch (error) {

    console.error('Add category error:', error);

    res.status(500).json({
      error: 'Failed to add category'
    });

  }

};

// =============================
// DELETE CATEGORY
// =============================
const deleteCategory = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // Delete all questions under this category first.
    await connection.query(
      `DELETE FROM survey_questions WHERE category_id = ?`,
      [id]
    );

    const [result] = await connection.query(
      `DELETE FROM survey_categories WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Category not found' });
    }

    // Reindex remaining categories to keep order clean.
    const [remaining] = await connection.query(
      `SELECT id FROM survey_categories ORDER BY order_index ASC, id ASC`
    );

    for (let i = 0; i < remaining.length; i += 1) {
      await connection.query(
        `UPDATE survey_categories SET order_index = ? WHERE id = ?`,
        [i, remaining[i].id]
      );
    }

    await connection.commit();
    return res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete category error:', error);
    return res.status(500).json({ error: 'Failed to delete category' });
  } finally {
    connection.release();
  }
};

// =============================
// ADD QUESTION (FIXED with programs)
// =============================
const addQuestion = async (req, res) => {

  try {

    const {
      category_id,
      text,
      type,
      required,
      options,
      scale_min,
      scale_max,
      order_index,
      version,
      colleges,
      programs
    } = req.body;

    console.log('Adding question:', { text, type, colleges, programs }); // Debug log

    const [result] = await db.query(
      `INSERT INTO survey_questions
       (category_id, text, type, required, options, scale_min, scale_max, order_index, version, colleges, programs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        text,
        type,
        required ? 1 : 0,
        options && options.length > 0 ? JSON.stringify(options) : null,
        scale_min || null,
        scale_max || null,
        order_index || 0,
        version,
        colleges && colleges.length > 0 ? JSON.stringify(colleges) : null,
        programs && programs.length > 0 ? JSON.stringify(programs) : null
      ]
    );

    const [q] = await db.query(
      `SELECT * FROM survey_questions WHERE id=?`,
      [result.insertId]
    );

    const question = {
      ...q[0],
      options: q[0].options ? JSON.parse(q[0].options) : null,
      colleges: q[0].colleges ? JSON.parse(q[0].colleges) : [],
      programs: q[0].programs ? JSON.parse(q[0].programs) : []
    };

    res.status(201).json(question);

  } catch (error) {

    console.error('Add question error:', error);

    res.status(500).json({
      error: 'Failed to add question',
      details: error.message
    });

  }

};

// =============================
// UPDATE QUESTION (FIXED with programs)
// =============================
const updateQuestion = async (req, res) => {

  try {

    const { id } = req.params;
    const { text, type, required, options, scale_min, scale_max, colleges, programs } = req.body;

    await db.query(
      `UPDATE survey_questions
       SET text=?, type=?, required=?, options=?, scale_min=?, scale_max=?, colleges=?, programs=?
       WHERE id=?`,
      [
        text,
        type,
        required ? 1 : 0,
        options && options.length > 0 ? JSON.stringify(options) : null,
        scale_min || null,
        scale_max || null,
        colleges && colleges.length > 0 ? JSON.stringify(colleges) : null,
        programs && programs.length > 0 ? JSON.stringify(programs) : null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Question updated'
    });

  } catch (error) {

    console.error('Update question error:', error);

    res.status(500).json({
      error: 'Failed to update question'
    });

  }

};

// =============================
// DELETE QUESTION
// =============================
const deleteQuestion = async (req, res) => {

  try {

    const { id } = req.params;

    await db.query(
      `DELETE FROM survey_questions WHERE id=?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Question deleted'
    });

  } catch (error) {

    console.error('Delete question error:', error);

    res.status(500).json({
      error: 'Failed to delete question'
    });

  }

};

// =============================
// GET PUBLISHED SURVEYS
// =============================
const getPublishedSurveys = async (req, res) => {

  try {

    const [surveys] = await db.query(
      `SELECT ps.*, c.name as college_name, c.code as college_code, u.username as published_by,
        (SELECT COUNT(*) FROM survey_questions WHERE version = ps.version) as total_questions,
        (SELECT COUNT(DISTINCT category_id) FROM survey_questions WHERE version = ps.version) as categories_count
       FROM published_surveys ps
       JOIN colleges c ON ps.college_id = c.id
       JOIN user u ON ps.published_by = u.id
       ORDER BY ps.published_at DESC`
    );

    res.json(surveys);

  } catch (error) {

    console.error('Get published surveys error:', error);

    res.status(500).json({
      error: 'Failed to fetch published surveys'
    });

  }

};

// =============================
// PUBLISH SURVEY
// =============================
const publishSurvey = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { college_id, version } = req.body;
    const published_by = req.user.id;

    console.log('Publishing survey:', { college_id, version, published_by }); // Debug log

    await connection.beginTransaction();

    const numericCollegeId = college_id ? Number(college_id) : null;
    if (!numericCollegeId || Number.isNaN(numericCollegeId)) {
      await connection.rollback();
      return res.status(400).json({ error: 'college_id is required' });
    }

    // Archive any existing active survey for this college
    const [archiveResult] = await connection.query(
      `UPDATE published_surveys
       SET status = 'archived'
       WHERE college_id = ? AND status = 'active'`,
      [numericCollegeId]
    );
    
    console.log('Archived previous surveys:', archiveResult.affectedRows);

    // Insert new published survey as ACTIVE
    const [result] = await connection.query(
      `INSERT INTO published_surveys
       (college_id, version, published_by, status)
       VALUES (?, ?, ?, 'active')`,  // Make sure status is set to 'active'
      [numericCollegeId, version, published_by]
    );

    console.log('New survey published with ID:', result.insertId);

    // Create notification for alumni in this college
    // This powers TopBar notifications for alumni users.
    const [notificationInsert] = await connection.query(
      `INSERT INTO notifications
        (title, body, type, target_role, target_college_id, target_program_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'New survey available',
        'A new tracer survey has been published. Please complete it to help improve the alumni insights.',
        'survey',
        'alumni',
        numericCollegeId,
        null,
        published_by
      ]
    );

    const notificationId = notificationInsert.insertId;

    // Fan-out notification to all alumni users whose program belongs to this college.
    await connection.query(
      `INSERT IGNORE INTO user_notifications (user_id, notification_id)
       SELECT DISTINCT u.id, ?
       FROM user u
       JOIN alumni_records ar ON ar.student_id = u.username
       JOIN programs p ON p.id = ar.program_id
       WHERE u.role = 'alumni' AND p.college_id = ?`,
      [notificationId, numericCollegeId]
    );

    await connection.commit();

    res.json({
      success: true,
      id: result.insertId,
      message: 'Survey published successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Publish survey error:', error);
    res.status(500).json({
      error: 'Failed to publish survey'
    });
  } finally {
    connection.release();
  }
};

// =============================
// ARCHIVE SURVEY
// =============================
const archiveSurvey = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE published_surveys 
       SET status = 'archived' 
       WHERE id = ?`,
      [id]
    );

    res.json({ 
      success: true, 
      message: 'Survey archived successfully' 
    });
  } catch (error) {
    console.error('Archive survey error:', error);
    res.status(500).json({ error: 'Failed to archive survey' });
  }
};

// =============================
// CLONE SURVEY
// =============================
const cloneSurvey = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    const [surveys] = await connection.query(
      `SELECT * FROM published_surveys WHERE id = ?`,
      [id]
    );

    if (surveys.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const survey = surveys[0];
    const newVersion = survey.version + 1;

    const [questions] = await connection.query(
      `SELECT * FROM survey_questions WHERE version = ?`,
      [survey.version]
    );

    await connection.beginTransaction();

    for (const q of questions) {
      await connection.query(
        `INSERT INTO survey_questions 
         (category_id, text, type, required, options, scale_min, scale_max, order_index, version, colleges, programs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.category_id, q.text, q.type, q.required, q.options, 
         q.scale_min, q.scale_max, q.order_index, newVersion, q.colleges, q.programs]
      );
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Survey cloned successfully',
      new_version: newVersion
    });

  } catch (error) {
    await connection.rollback();
    console.error('Clone survey error:', error);
    res.status(500).json({ error: 'Failed to clone survey' });
  } finally {
    connection.release();
  }
};
// =============================
// ACTIVATE SURVEY
// =============================
const activateSurvey = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();

    // Get the survey to activate
    const [surveys] = await connection.query(
      `SELECT college_id FROM published_surveys WHERE id = ?`,
      [id]
    );

    if (surveys.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const collegeId = surveys[0].college_id;

    // Archive any other active survey for this college
    await connection.query(
      `UPDATE published_surveys
       SET status = 'archived'
       WHERE college_id = ? AND status = 'active'`,
      [collegeId]
    );

    // Activate the selected survey
    await connection.query(
      `UPDATE published_surveys
       SET status = 'active'
       WHERE id = ?`,
      [id]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Survey activated successfully' 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Activate survey error:', error);
    res.status(500).json({ error: 'Failed to activate survey' });
  } finally {
    connection.release();
  }
};

// =============================
// GET COLLEGE SURVEY (for alumni)
// =============================
const getCollegeSurvey = async (req, res) => {
  try {
    const { collegeId } = req.params;

    const [published] = await db.query(
      `SELECT * FROM published_surveys 
       WHERE college_id = ? AND status = 'active'
       ORDER BY published_at DESC LIMIT 1`,
      [collegeId]
    );

    if (published.length === 0) {
      return res.status(404).json({ error: 'No active survey found for this college' });
    }

    const version = published[0].version;

    const [categories] = await db.query(
      `SELECT * FROM survey_categories ORDER BY order_index ASC`
    );

    const result = [];
    for (const cat of categories) {
      const [questions] = await db.query(
        `SELECT * FROM survey_questions 
         WHERE category_id = ? AND version = ? 
         AND (colleges IS NULL OR colleges = '[]' OR JSON_CONTAINS(colleges, ?))
         ORDER BY order_index ASC`,
        [cat.id, version, JSON.stringify(String(collegeId))]
      );

      const parsedQuestions = questions.map(q => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
        colleges: q.colleges ? JSON.parse(q.colleges) : [],
        programs: q.programs ? JSON.parse(q.programs) : []
      }));

      result.push({
        ...cat,
        questions: parsedQuestions
      });
    }

    res.json({ 
      survey: result,
      version: version,
      published_at: published[0].published_at
    });

  } catch (error) {
    console.error('Get college survey error:', error);
    res.status(500).json({ error: 'Failed to fetch college survey' });
  }
};

// =============================
// SUBMIT SURVEY RESPONSE
// =============================
const submitSurveyResponse = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { studentId } = req.params;
    const { version, answers } = req.body;

    await connection.beginTransaction();

    const [responseResult] = await connection.query(
      `INSERT INTO survey_responses 
       (student_id, survey_version, completed_at, status) 
       VALUES (?, ?, NOW(), 'completed')`,
      [studentId, version]
    );

    const responseId = responseResult.insertId;

    for (const answer of answers) {
      await connection.query(
        `INSERT INTO survey_answers 
         (response_id, question_id, answer_text, answer_options, answer_number)
         VALUES (?, ?, ?, ?, ?)`,
        [
          responseId, 
          answer.question_id, 
          answer.answer_text || null,
          answer.answer_options ? JSON.stringify(answer.answer_options) : null,
          answer.answer_number || null
        ]
      );
    }

    await connection.query(
      `UPDATE alumni_records 
       SET survey_status = 'completed' 
       WHERE student_id = ?`,
      [studentId]
    );

    await connection.commit();

    res.json({ 
      success: true, 
      message: 'Survey submitted successfully' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Submit survey error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  } finally {
    connection.release();
  }
};

// =============================
// GET SURVEY RESPONSES (for admin)
// =============================
const getSurveyResponses = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const [responses] = await db.query(
      `SELECT 
        sr.*,
        sa.question_id,
        sa.answer_text,
        sa.answer_options,
        sa.answer_number,
        sq.text as question_text,
        sq.type as question_type
       FROM survey_responses sr
       LEFT JOIN survey_answers sa ON sr.id = sa.response_id
       LEFT JOIN survey_questions sq ON sa.question_id = sq.id
       WHERE sr.student_id = ?
       ORDER BY sr.completed_at DESC, sa.id ASC`,
      [studentId]
    );
    
    // Group answers by response
    const grouped = responses.reduce((acc, row) => {
      if (!acc[row.id]) {
        acc[row.id] = {
          id: row.id,
          student_id: row.student_id,
          survey_version: row.survey_version,
          completed_at: row.completed_at,
          status: row.status,
          answers: []
        };
      }
      if (row.question_id) {
        acc[row.id].answers.push({
          question_id: row.question_id,
          question_text: row.question_text,
          question_type: row.question_type,
          answer_text: row.answer_text,
          answer_options: row.answer_options ? JSON.parse(row.answer_options) : null,
          answer_number: row.answer_number
        });
      }
      return acc;
    }, {});
    
    res.json(Object.values(grouped));
  } catch (error) {
    console.error('Get survey responses error:', error);
    res.status(500).json({ error: 'Failed to fetch survey responses' });
  }
};



// Check survey status
const checkSurveyStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const [records] = await db.query(
      'SELECT survey_status FROM alumni_records WHERE student_id = ?',
      [studentId]
    );
    
    if (records.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ 
      completed: records[0].survey_status === 'completed',
      status: records[0].survey_status
    });
  } catch (error) {
    console.error('Check survey status error:', error);
    res.status(500).json({ error: 'Failed to check survey status' });
  }
};

// =============================
// EXPORT ALL FUNCTIONS
// =============================
module.exports = {
  getSurvey,
  getVersions,
  saveSurvey,
  createVersion,
  addCategory,
  deleteCategory,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getPublishedSurveys,
  publishSurvey,
  archiveSurvey,
  cloneSurvey,
  getCollegeSurvey,
  submitSurveyResponse,
  getSurveyResponses,
  checkSurveyStatus,
  activateSurvey
};