const db = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');

async function resolveCollege(collegeName, collegeCode, cache) {
  if (cache.has(collegeName)) return cache.get(collegeName);

  const [existing] = await db.query(
    'SELECT id FROM colleges WHERE name = ? OR code = ?',
    [collegeName, collegeCode || collegeName]
  );

  let collegeId;
  if (existing.length > 0) {
    collegeId = existing[0].id;
  } else {
    const code =
      collegeCode ||
      collegeName.substring(0, 10).toUpperCase().replace(/\s+/g, '_');
    const [result] = await db.query(
      'INSERT INTO colleges (name, code, description) VALUES (?, ?, ?)',
      [collegeName, code, 'Imported from Excel']
    );
    collegeId = result.insertId;
  }

  cache.set(collegeName, collegeId);
  return collegeId;
}

async function resolveProgram(programName, collegeId, cache) {
  if (cache.has(programName)) return cache.get(programName);

  const [existing] = await db.query(
    'SELECT id FROM programs WHERE name = ?',
    [programName]
  );

  let programId;
  if (existing.length > 0) {
    programId = existing[0].id;
    await db.query(
      'UPDATE programs SET college_id = ? WHERE id = ? AND college_id != ?',
      [collegeId, programId, collegeId]
    );
  } else {
    const code = programName.substring(0, 20).toUpperCase().replace(/\s+/g, '_');
    const [result] = await db.query(
      'INSERT INTO programs (name, code, college_id, description) VALUES (?, ?, ?, ?)',
      [programName, code, collegeId, 'Imported from Excel']
    );
    programId = result.insertId;
  }

  cache.set(programName, programId);
  return programId;
}

async function resolveUnknownCollege(cache) {
  const cacheKey = '__unknown__';
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const [existing] = await db.query(
    "SELECT id FROM colleges WHERE code = 'UNKNOWN' LIMIT 1"
  );

  let collegeId;
  if (existing.length > 0) {
    collegeId = existing[0].id;
  } else {
    const [result] = await db.query(
      "INSERT INTO colleges (name, code, description) VALUES ('Unknown', 'UNKNOWN', 'Auto-created')"
    );
    collegeId = result.insertId;
  }

  cache.set(cacheKey, collegeId);
  return collegeId;
}

function cleanupUploadedFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function buildAlumniFilters(query = {}) {
  const clauses = [];
  const params = [];
  const { search, program, batch, batchYear, college } = query;

  if (search) {
    clauses.push(
      "(ar.student_id LIKE ? OR ar.first_name LIKE ? OR ar.last_name LIKE ? OR CONCAT(ar.first_name, ' ', ar.last_name) LIKE ?)"
    );
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (college && college !== 'all') {
    clauses.push('c.id = ?');
    params.push(college);
  }

  if (program && program !== 'all') {
    const programValue = String(program).trim();
    if (/^\d+$/.test(programValue)) {
      clauses.push('p.id = ?');
      params.push(Number(programValue));
    } else {
      clauses.push('(p.name = ? OR p.code = ?)');
      params.push(programValue, programValue);
    }
  }

  const selectedBatch =
    batch && batch !== 'all'
      ? batch
      : batchYear && batchYear !== 'all'
        ? batchYear
        : null;

  if (selectedBatch) {
    clauses.push('ar.batch_year = ?');
    params.push(selectedBatch);
  }

  return {
    whereClause: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

const checkDuplicates = async (req, res) => {
  try {
    const { studentIds = [], emails = [] } = req.body;

    if (!Array.isArray(studentIds) || !Array.isArray(emails)) {
      return res
        .status(400)
        .json({ error: 'studentIds and emails must be arrays' });
    }

    let existingStudentIds = [];
    let existingEmails = [];

    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT student_id FROM alumni_records WHERE student_id IN (${placeholders})`,
        studentIds
      );
      existingStudentIds = rows.map((row) => row.student_id);
    }

    const filteredEmails = emails.filter(Boolean);
    if (filteredEmails.length > 0) {
      const placeholders = filteredEmails.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT email FROM alumni_records WHERE email IN (${placeholders})`,
        filteredEmails
      );
      existingEmails = rows.map((row) => row.email);
    }

    res.json({ existingStudentIds, existingEmails });
  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
};

const importBatch = async (req, res) => {
  try {
    const { records = [], filename = 'import' } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records provided' });
    }

    const collegeCache = new Map();
    const programCache = new Map();

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    await db.query('START TRANSACTION');

    try {
      const [historyResult] = await db.query(
        `INSERT INTO import_history
         (filename, uploaded_by, total_records, success_count, failed_count, status)
         VALUES (?, ?, ?, 0, 0, 'pending')`,
        [filename, req.user.id, records.length]
      );
      const importId = historyResult.insertId;

      for (let i = 0; i < records.length; i += 1) {
        const row = records[i];

        try {
          const studentId = String(row.student_id).trim();
          const email = row.email ? String(row.email).trim() : null;

          const [existing] = await db.query(
            'SELECT id FROM alumni_records WHERE student_id = ?',
            [studentId]
          );
          if (existing.length > 0) {
            skipped += 1;
            continue;
          }

          if (email) {
            const [emailExists] = await db.query(
              'SELECT id FROM alumni_records WHERE email = ?',
              [email]
            );
            if (emailExists.length > 0) {
              skipped += 1;
              continue;
            }
          }

          let programId = null;
          if (row.program) {
            if (programCache.has(row.program)) {
              programId = programCache.get(row.program);
            } else {
              const [existingProgram] = await db.query(
                'SELECT id FROM programs WHERE name = ?',
                [row.program]
              );

              if (existingProgram.length > 0) {
                programId = existingProgram[0].id;
                programCache.set(row.program, programId);
              } else {
                const fallbackCollegeId = await resolveUnknownCollege(collegeCache);
                programId = await resolveProgram(
                  row.program,
                  fallbackCollegeId,
                  programCache
                );
              }
            }
          }

          const [userExists] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [studentId]
          );
          const recordStatus =
            row.status &&
            ['active', 'inactive', 'graduated'].includes(
              String(row.status).toLowerCase()
            )
              ? String(row.status).toLowerCase()
              : userExists.length > 0
                ? 'active'
                : 'inactive';

          await db.query(
            `INSERT INTO alumni_records
             (student_id, first_name, last_name, middle_name, suffix,
              email, program_id, batch_year, status, survey_status,
              imported_by, imported_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
            [
              studentId,
              String(row.first_name).trim(),
              String(row.last_name).trim(),
              row.middle_name || null,
              row.suffix || null,
              email,
              programId,
              Number(row.batch_year),
              recordStatus,
              req.user.id,
            ]
          );

          inserted += 1;
        } catch (error) {
          const rowNumber = row.rowIndex ?? i + 2;
          errors.push({ row: rowNumber, error: error.message });
          await db.query(
            'INSERT INTO import_errors (import_id, row_number, error, raw_data) VALUES (?, ?, ?, ?)',
            [importId, rowNumber, error.message, JSON.stringify(row)]
          );
        }
      }

      const finalStatus =
        errors.length === 0 ? 'completed' : inserted > 0 ? 'partial' : 'failed';

      await db.query(
        'UPDATE import_history SET success_count = ?, failed_count = ?, status = ? WHERE id = ?',
        [inserted, errors.length, finalStatus, importId]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    res.json({ inserted, skipped, errors });
  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({ error: 'Failed to process batch import' });
  }
};

const importAlumni = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;

    let allData = [];
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(worksheet);
      allData = [
        ...allData,
        ...sheetData.map((row) => ({ ...row, _sheet: sheetName })),
      ];
    }

    const results = {
      total: allData.length,
      success: 0,
      failed: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    await db.query('START TRANSACTION');

    try {
      const [historyResult] = await db.query(
        `INSERT INTO import_history
         (filename, uploaded_by, total_records, success_count, failed_count, status)
         VALUES (?, ?, ?, 0, 0, 'pending')`,
        [req.file.originalname, req.user.id, allData.length]
      );
      const importId = historyResult.insertId;

      const collegeCache = new Map();
      const programCache = new Map();

      for (let i = 0; i < allData.length; i += 1) {
        const row = allData[i];

        try {
          const studentData = {
            student_id: String(
              row['Student ID'] ||
                row.student_id ||
                row.ID ||
                row.id ||
                ''
            ).trim(),
            first_name: String(
              row['First Name'] || row.first_name || row.FirstName || ''
            ).trim(),
            last_name: String(
              row['Last Name'] || row.last_name || row.LastName || ''
            ).trim(),
            middle_name: row['Middle Name'] || row.middle_name || null,
            suffix: row.Suffix || row.suffix || null,
            email: row.Email || row.email || null,
            college_name: String(row.College || row.college || '').trim(),
            college_code: row.Code || row.code || null,
            program_name: String(
              row.Program || row.program || row.Course || row.course || ''
            ).trim(),
            batch_year:
              row['Batch Year'] || row.batch_year || row.Year || row.year,
          };

          if (
            !studentData.student_id ||
            !studentData.first_name ||
            !studentData.last_name ||
            !studentData.program_name ||
            !studentData.batch_year
          ) {
            throw new Error('Missing required fields');
          }

          const [existing] = await db.query(
            'SELECT id FROM alumni_records WHERE student_id = ?',
            [studentData.student_id]
          );
          if (existing.length > 0) {
            results.duplicatesSkipped += 1;
            continue;
          }

          if (studentData.email) {
            const [emailExists] = await db.query(
              'SELECT id FROM alumni_records WHERE email = ?',
              [studentData.email]
            );
            if (emailExists.length > 0) {
              results.duplicatesSkipped += 1;
              continue;
            }
          }

          let collegeId;
          if (studentData.college_name) {
            collegeId = await resolveCollege(
              studentData.college_name,
              studentData.college_code,
              collegeCache
            );
          } else {
            collegeId = await resolveUnknownCollege(collegeCache);
          }

          const programId = await resolveProgram(
            studentData.program_name,
            collegeId,
            programCache
          );

          const [userExists] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [studentData.student_id]
          );
          const status = userExists.length > 0 ? 'active' : 'inactive';

          await db.query(
            `INSERT INTO alumni_records
             (student_id, first_name, last_name, middle_name, suffix,
              email, program_id, batch_year, status, survey_status,
              imported_by, imported_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
            [
              studentData.student_id,
              studentData.first_name,
              studentData.last_name,
              studentData.middle_name,
              studentData.suffix,
              studentData.email,
              programId,
              studentData.batch_year,
              status,
              req.user.id,
            ]
          );

          results.success += 1;
        } catch (error) {
          results.failed += 1;
          results.errors.push({ row: i + 2, error: error.message });
          await db.query(
            'INSERT INTO import_errors (import_id, row_number, error, raw_data) VALUES (?, ?, ?, ?)',
            [importId, i + 2, error.message, JSON.stringify(row)]
          );
        }
      }

      const finalStatus =
        results.failed === 0 ? 'completed' : results.success > 0 ? 'partial' : 'failed';

      await db.query(
        'UPDATE import_history SET success_count = ?, failed_count = ?, status = ? WHERE id = ?',
        [results.success, results.failed, finalStatus, importId]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import alumni data' });
  } finally {
    cleanupUploadedFile(req.file && req.file.path);
  }
};

const deactivateAlumni = async (req, res) => {
  try {
    const { studentId } = req.params;
    const [result] = await db.query(
      "UPDATE alumni_records SET status = 'inactive' WHERE student_id = ?",
      [studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alumni record not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Deactivate alumni error:', error);
    res.status(500).json({ error: 'Failed to deactivate alumni record' });
  }
};

const getAlumniRecords = async (req, res) => {
  try {
    const { whereClause, params } = buildAlumniFilters(req.query);

    const query = `
      SELECT
        ar.id,
        ar.student_id,
        CONCAT(ar.first_name, ' ', ar.last_name) AS name,
        p.name AS program,
        p.id AS program_id,
        c.name AS college,
        c.id AS college_id,
        ar.batch_year AS batch,
        ar.status,
        ar.survey_status,
        ar.email
      FROM alumni_records ar
      LEFT JOIN programs p ON ar.program_id = p.id
      LEFT JOIN colleges c ON p.college_id = c.id
      WHERE 1=1${whereClause}
      ORDER BY ar.batch_year DESC, ar.last_name ASC
    `;

    const [records] = await db.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get alumni error:', error);
    res.status(500).json({ error: 'Failed to fetch alumni records' });
  }
};

const checkAlumniRecord = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [records] = await db.query(
      `SELECT
        ar.student_id,
        ar.first_name,
        ar.last_name,
        ar.middle_name,
        ar.suffix,
        CONCAT(ar.first_name, ' ', ar.last_name) AS full_name,
        p.name AS program,
        ar.batch_year,
        ar.status
      FROM alumni_records ar
      LEFT JOIN programs p ON ar.program_id = p.id
      WHERE ar.student_id = ?`,
      [studentId]
    );

    if (records.length === 0) {
      return res.json({ exists: false });
    }

    const [users] = await db.query(
      'SELECT id FROM user WHERE username = ?',
      [studentId]
    );

    res.json({
      exists: true,
      hasAccount: users.length > 0,
      record: records[0],
    });
  } catch (error) {
    console.error('Check alumni error:', error);
    res.status(500).json({ error: 'Failed to check alumni record' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { collegeId } = req.query;

    let query = `
      SELECT p.*, c.name AS college_name, c.code AS college_code
      FROM programs p
      LEFT JOIN colleges c ON p.college_id = c.id
    `;
    const params = [];

    if (collegeId && collegeId !== 'all') {
      query += ' WHERE p.college_id = ?';
      params.push(collegeId);
    }

    query += ' ORDER BY p.name ASC';

    const [programs] = await db.query(query, params);
    res.json(programs);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

const getBatchYears = async (req, res) => {
  try {
    const [years] = await db.query(
      'SELECT DISTINCT batch_year FROM alumni_records ORDER BY batch_year DESC'
    );
    res.json(years.map((year) => year.batch_year));
  } catch (error) {
    console.error('Get batch years error:', error);
    res.status(500).json({ error: 'Failed to fetch batch years' });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const [history] = await db.query(
      `SELECT ih.*, u.username AS uploaded_by
       FROM import_history ih
       LEFT JOIN user u ON ih.uploaded_by = u.id
       ORDER BY ih.uploaded_at DESC
       LIMIT 50`
    );
    res.json(history);
  } catch (error) {
    console.error('Get import history error:', error);
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
};

const downloadErrorReport = async (req, res) => {
  try {
    const { importId } = req.params;
    const [errors] = await db.query(
      'SELECT * FROM import_errors WHERE import_id = ?',
      [importId]
    );

    if (errors.length === 0) {
      return res.status(404).json({ error: 'No errors found' });
    }

    let csv = 'Row Number,Error,Raw Data\n';
    errors.forEach((error) => {
      csv += `${error.row_number},"${error.error}","${error.raw_data || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=import-errors-${importId}.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error('Download error report error:', error);
    res.status(500).json({ error: 'Failed to download error report' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { whereClause, params } = buildAlumniFilters(req.query);

    const [kpiRows] = await db.query(
      `SELECT
         COUNT(*) AS totalAlumni,
         SUM(CASE WHEN ar.survey_status = 'completed' THEN 1 ELSE 0 END) AS completedSurveys
       FROM alumni_records ar
       LEFT JOIN programs p ON ar.program_id = p.id
       LEFT JOIN colleges c ON p.college_id = c.id
       WHERE 1=1${whereClause}`,
      params
    );

    const totals = kpiRows[0] || {};
    const totalAlumni = Number(totals.totalAlumni) || 0;
    const completedSurveys = Number(totals.completedSurveys) || 0;
    const participationRate =
      totalAlumni === 0 ? 0 : Number(((completedSurveys / totalAlumni) * 100).toFixed(1));

    const kpis = {
      totalAlumni,
      totalAlumniTrend: 5,
      participationRate,
      participationTrend: 2.1,
      employmentRate: 80.0,
      employmentTrend: 1.5,
      degreeAlignment: 70.0,
    };

    const [programRows] = await db.query(
      `SELECT
         COALESCE(p.code, p.name, 'UNASSIGNED') AS program,
         COUNT(ar.id) AS count
       FROM alumni_records ar
       LEFT JOIN programs p ON ar.program_id = p.id
       LEFT JOIN colleges c ON p.college_id = c.id
       WHERE 1=1${whereClause}
       GROUP BY p.id, p.code, p.name
       ORDER BY count DESC, program ASC`,
      params
    );

    const programData = programRows.map((row) => {
      const count = Number(row.count) || 0;
      return {
        program: row.program,
        count,
        employed: Math.floor(count * 0.8),
      };
    });

    const [trendRows] = await db.query(
      `SELECT ar.batch_year AS year, COUNT(ar.id) AS total
       FROM alumni_records ar
       LEFT JOIN programs p ON ar.program_id = p.id
       LEFT JOIN colleges c ON p.college_id = c.id
       WHERE ar.batch_year IS NOT NULL${whereClause}
       GROUP BY ar.batch_year
       ORDER BY ar.batch_year ASC
       LIMIT 5`,
      params
    );

    const trendData = trendRows.map((row) => ({
      year: row.year,
      rate: 80,
      male: 75,
      female: 85,
    }));

    res.json({ kpis, programData, trendData });
  } catch (error) {
    console.error('Analytics error:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch analytics data', details: error.message });
  }
};

const getReports = async (req, res) => {
  const { type } = req.query;

  try {
    const { whereClause, params } = buildAlumniFilters(req.query);
    let reportData = [];

    if (type === 'Alumni per Program') {
      const [rows] = await db.query(
        `SELECT
           COALESCE(p.name, 'Unknown') AS programName,
           COUNT(ar.id) AS count
         FROM alumni_records ar
         LEFT JOIN programs p ON ar.program_id = p.id
         LEFT JOIN colleges c ON p.college_id = c.id
         WHERE 1=1${whereClause}
         GROUP BY p.id, p.name
         ORDER BY programName ASC`,
        params
      );

      reportData = rows.map((row) => {
        const count = Number(row.count) || 0;
        return {
          'Program Name': row.programName,
          'Total Alumni': count,
          Employed: Math.floor(count * 0.8),
          'Employment Rate (%)': 80,
        };
      });
    } else if (type === 'Participation Rate') {
      const [rows] = await db.query(
        `SELECT ar.survey_status, COUNT(*) AS count
         FROM alumni_records ar
         LEFT JOIN programs p ON ar.program_id = p.id
         LEFT JOIN colleges c ON p.college_id = c.id
         WHERE 1=1${whereClause}
         GROUP BY ar.survey_status
         ORDER BY ar.survey_status ASC`,
        params
      );

      const totalRecords = rows.reduce(
        (sum, row) => sum + (Number(row.count) || 0),
        0
      );

      reportData = rows.map((row) => {
        const count = Number(row.count) || 0;
        const percentage =
          totalRecords === 0 ? 0 : Math.round((count / totalRecords) * 100);
        return {
          'Survey Status': row.survey_status || 'Unknown',
          'Total Users': count,
          'Percentage (%)': percentage,
        };
      });
    } else if (type === 'Employment Trends') {
      const [rows] = await db.query(
        `SELECT ar.batch_year, COUNT(ar.id) AS total
         FROM alumni_records ar
         LEFT JOIN programs p ON ar.program_id = p.id
         LEFT JOIN colleges c ON p.college_id = c.id
         WHERE ar.batch_year IS NOT NULL${whereClause}
         GROUP BY ar.batch_year
         ORDER BY ar.batch_year DESC`,
        params
      );

      reportData = rows.map((row) => ({
        Year: row.batch_year,
        'Overall Rate (%)': 80,
        'Male Employment (%)': 75,
        'Female Employment (%)': 85,
      }));
    } else if (type === 'Degree Alignment') {
      reportData = [
        { 'Alignment Level': 'Highly Relevant', 'Alumni Count': 450, 'Percentage (%)': 45 },
        { 'Alignment Level': 'Moderately Relevant', 'Alumni Count': 350, 'Percentage (%)': 35 },
        { 'Alignment Level': 'Slightly Relevant', 'Alumni Count': 150, 'Percentage (%)': 15 },
        { 'Alignment Level': 'Not Relevant', 'Alumni Count': 50, 'Percentage (%)': 5 },
      ];
    } else if (type === 'Skills Assessment Summary') {
      reportData = [
        { 'Skill Category': 'Technical Skills', 'Average Score (/100)': 85 },
        { 'Skill Category': 'Communication', 'Average Score (/100)': 78 },
        { 'Skill Category': 'Problem Solving', 'Average Score (/100)': 82 },
      ];
    }

    res.json(reportData);
  } catch (error) {
    console.error('Reports error:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch reports data', details: error.message });
  }
};

module.exports = {
  importAlumni,
  importBatch,
  checkDuplicates,
  deactivateAlumni,
  getAlumniRecords,
  checkAlumniRecord,
  getPrograms,
  getBatchYears,
  getImportHistory,
  downloadErrorReport,
  getAnalytics,
  getReports,
};
