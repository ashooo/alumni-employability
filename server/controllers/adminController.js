const db = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');

// ─── Helper: resolve college (create if missing) ──────────────────────────────
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
    const code = collegeCode ||
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

// ─── Helper: resolve program (create if missing) ──────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/import/check-duplicates
// Body: { studentIds: string[], emails: string[] }
// Returns: { existingStudentIds: string[], existingEmails: string[] }
// ─────────────────────────────────────────────────────────────────────────────
const checkDuplicates = async (req, res) => {
  try {
    const { studentIds = [], emails = [] } = req.body;

    if (!Array.isArray(studentIds) || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'studentIds and emails must be arrays' });
    }

    let existingStudentIds = [];
    let existingEmails = [];

    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT student_id FROM alumni_records WHERE student_id IN (${placeholders})`,
        studentIds
      );
      existingStudentIds = rows.map(r => r.student_id);
    }

    const filteredEmails = emails.filter(Boolean);
    if (filteredEmails.length > 0) {
      const placeholders = filteredEmails.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT email FROM alumni_records WHERE email IN (${placeholders})`,
        filteredEmails
      );
      existingEmails = rows.map(r => r.email);
    }

    res.json({ existingStudentIds, existingEmails });
  } catch (error) {
    console.error('Check duplicates error:', error);
    res.status(500).json({ error: 'Failed to check duplicates' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/import/batch
// Body: { records: ParsedRow[], filename: string }
// Inserts only NEW records (skips existing student_id / email). Returns summary.
// ─────────────────────────────────────────────────────────────────────────────
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

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          // ── SKIP if student_id already exists in DB ──────────────────────
          const [existing] = await db.query(
            'SELECT id FROM alumni_records WHERE student_id = ?',
            [String(row.student_id).trim()]
          );
          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // ── SKIP if email already exists in DB ───────────────────────────
          if (row.email) {
            const [emailExists] = await db.query(
              'SELECT id FROM alumni_records WHERE email = ?',
              [String(row.email).trim()]
            );
            if (emailExists.length > 0) {
              skipped++;
              continue;
            }
          }

          // ── Resolve program ──────────────────────────────────────────────
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
                // Auto-create program under fallback college
                let fallbackCollegeId = collegeCache.get('__unknown__');
                if (!fallbackCollegeId) {
                  const [uc] = await db.query(
                    "SELECT id FROM colleges WHERE code = 'UNKNOWN' LIMIT 1"
                  );
                  if (uc.length > 0) {
                    fallbackCollegeId = uc[0].id;
                  } else {
                    const [nc] = await db.query(
                      "INSERT INTO colleges (name, code, description) VALUES ('Unknown', 'UNKNOWN', 'Auto-created')"
                    );
                    fallbackCollegeId = nc.insertId;
                  }
                  collegeCache.set('__unknown__', fallbackCollegeId);
                }
                programId = await resolveProgram(row.program, fallbackCollegeId, programCache);
              }
            }
          }

          // ── Determine status ─────────────────────────────────────────────
          const [userExists] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [String(row.student_id).trim()]
          );
          const recordStatus = (row.status && ['active','inactive','graduated'].includes(row.status.toLowerCase()))
            ? row.status.toLowerCase()
            : (userExists.length > 0 ? 'active' : 'inactive');

          // ── INSERT ───────────────────────────────────────────────────────
          await db.query(
            `INSERT INTO alumni_records 
             (student_id, first_name, last_name, middle_name, suffix,
              email, program_id, batch_year, status, survey_status,
              imported_by, imported_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
            [
              String(row.student_id).trim(),
              String(row.first_name).trim(),
              String(row.last_name).trim(),
              row.middle_name || null,
              row.suffix || null,
              row.email || null,
              programId,
              Number(row.batch_year),
              recordStatus,
              req.user.id,
            ]
          );

          inserted++;
        } catch (err) {
          errors.push({ row: row.rowIndex ?? i + 2, error: err.message });
          await db.query(
            'INSERT INTO import_errors (import_id, row_number, error, raw_data) VALUES (?, ?, ?, ?)',
            [importId, row.rowIndex ?? i + 2, err.message, JSON.stringify(row)]
          );
        }
      }

      const finalStatus = errors.length === 0 ? 'completed'
        : inserted > 0 ? 'partial'
        : 'failed';

      await db.query(
        'UPDATE import_history SET success_count = ?, failed_count = ?, status = ? WHERE id = ?',
        [inserted, errors.length, finalStatus, importId]
      );

      await db.query('COMMIT');

      console.log(`Batch import — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors.length}`);
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

    res.json({ inserted, skipped, errors });
  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({ error: 'Failed to process batch import' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/import  (legacy file-upload route — now SKIPS duplicates)
// ─────────────────────────────────────────────────────────────────────────────
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
      allData = [...allData, ...sheetData.map(row => ({ ...row, _sheet: sheetName }))];
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

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        try {
          const studentData = {
            student_id:   String(row['Student ID'] || row['student_id'] || row['ID'] || row['id'] || '').trim(),
            first_name:   String(row['First Name'] || row['first_name'] || row['FirstName'] || '').trim(),
            last_name:    String(row['Last Name']  || row['last_name']  || row['LastName']  || '').trim(),
            middle_name:  row['Middle Name'] || row['middle_name'] || null,
            suffix:       row['Suffix']      || row['suffix']      || null,
            email:        row['Email']       || row['email']       || null,
            college_name: String(row['College'] || row['college'] || '').trim(),
            college_code: row['Code'] || row['code'] || null,
            program_name: String(row['Program'] || row['program'] || row['Course'] || row['course'] || '').trim(),
            batch_year:   row['Batch Year'] || row['batch_year'] || row['Year'] || row['year'],
          };

          if (!studentData.student_id || !studentData.first_name || !studentData.last_name ||
              !studentData.program_name || !studentData.batch_year) {
            throw new Error('Missing required fields');
          }

          // ── SKIP if student_id already exists ────────────────────────────
          const [existing] = await db.query(
            'SELECT id FROM alumni_records WHERE student_id = ?',
            [studentData.student_id]
          );
          if (existing.length > 0) {
            results.duplicatesSkipped++;
            continue;
          }

          // ── SKIP if email already exists ─────────────────────────────────
          if (studentData.email) {
            const [emailExists] = await db.query(
              'SELECT id FROM alumni_records WHERE email = ?',
              [studentData.email]
            );
            if (emailExists.length > 0) {
              results.duplicatesSkipped++;
              continue;
            }
          }

          // ── Resolve college & program ────────────────────────────────────
          let collegeId = null;
          if (studentData.college_name) {
            collegeId = await resolveCollege(
              studentData.college_name, studentData.college_code, collegeCache
            );
          }
          const programId = collegeId
            ? await resolveProgram(studentData.program_name, collegeId, programCache)
            : null;

          const [userExists] = await db.query(
            'SELECT id FROM user WHERE username = ?', [studentData.student_id]
          );
          const status = userExists.length > 0 ? 'active' : 'inactive';

          await db.query(
            `INSERT INTO alumni_records 
             (student_id, first_name, last_name, middle_name, suffix,
              email, program_id, batch_year, status, survey_status,
              imported_by, imported_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
            [studentData.student_id, studentData.first_name, studentData.last_name,
             studentData.middle_name, studentData.suffix, studentData.email,
             programId, studentData.batch_year, status, req.user.id]
          );

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({ row: i + 2, error: error.message });
          await db.query(
            'INSERT INTO import_errors (import_id, row_number, error, raw_data) VALUES (?, ?, ?, ?)',
            [importId, i + 2, error.message, JSON.stringify(row)]
          );
        }
      }

      const finalStatus = results.failed === 0 ? 'completed'
        : results.success > 0 ? 'partial'
        : 'failed';

      await db.query(
        'UPDATE import_history SET success_count = ?, failed_count = ?, status = ? WHERE id = ?',
        [results.success, results.failed, finalStatus, importId]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    fs.unlinkSync(req.file.path);

    res.json({ success: true, results });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import alumni data' });
  }
};

// ─── Unchanged controllers ────────────────────────────────────────────────────

const getAlumniRecords = async (req, res) => {
  try {
    const { search, program, batch, college } = req.query;
    let query = `
      SELECT 
        ar.id, ar.student_id, 
        CONCAT(ar.first_name, ' ', ar.last_name) as name,
        p.name as program, p.id as program_id,
        c.name as college,  c.id as college_id,
        ar.batch_year as batch, ar.status, ar.survey_status, ar.email
      FROM alumni_records ar
      LEFT JOIN programs p ON ar.program_id = p.id
      LEFT JOIN colleges c ON p.college_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ` AND (ar.student_id LIKE ? OR ar.first_name LIKE ? OR ar.last_name LIKE ? OR CONCAT(ar.first_name, ' ', ar.last_name) LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (program && program !== 'all') { query += ' AND p.id = ?'; params.push(program); }
    if (college && college !== 'all') { query += ' AND c.id = ?'; params.push(college); }
    if (batch   && batch   !== 'all') { query += ' AND ar.batch_year = ?'; params.push(batch); }
    query += ' ORDER BY ar.batch_year DESC, ar.last_name ASC';
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
      `SELECT ar.student_id, ar.first_name, ar.last_name, ar.middle_name, ar.suffix,
              CONCAT(ar.first_name, ' ', ar.last_name) as full_name,
              p.name as program, ar.batch_year, ar.status
       FROM alumni_records ar
       LEFT JOIN programs p ON ar.program_id = p.id
       WHERE ar.student_id = ?`,
      [studentId]
    );
    if (records.length === 0) return res.json({ exists: false });
    const [users] = await db.query('SELECT id FROM user WHERE username = ?', [studentId]);
    res.json({ exists: true, hasAccount: users.length > 0, record: records[0] });
  } catch (error) {
    console.error('Check alumni error:', error);
    res.status(500).json({ error: 'Failed to check alumni record' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const { collegeId } = req.query;
    let query = `
      SELECT p.*, c.name as college_name, c.code as college_code
      FROM programs p LEFT JOIN colleges c ON p.college_id = c.id
    `;
    const params = [];
    if (collegeId && collegeId !== 'all') { query += ' WHERE p.college_id = ?'; params.push(collegeId); }
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
    res.json(years.map(y => y.batch_year));
  } catch (error) {
    console.error('Get batch years error:', error);
    res.status(500).json({ error: 'Failed to fetch batch years' });
  }
};

const getImportHistory = async (req, res) => {
  try {
    const [history] = await db.query(
      `SELECT ih.*, u.username as uploaded_by
       FROM import_history ih
       LEFT JOIN user u ON ih.uploaded_by = u.id
       ORDER BY ih.uploaded_at DESC LIMIT 50`
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
      'SELECT * FROM import_errors WHERE import_id = ?', [importId]
    );
    if (errors.length === 0) return res.status(404).json({ error: 'No errors found' });
    let csv = 'Row Number,Error,Raw Data\n';
    errors.forEach(err => {
      csv += `${err.row_number},"${err.error}","${err.raw_data || ''}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=import-errors-${importId}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Download error report error:', error);
    res.status(500).json({ error: 'Failed to download error report' });
  }
};

module.exports = {
  importAlumni,
  importBatch,
  checkDuplicates,
  getAlumniRecords,
  checkAlumniRecord,
  getPrograms,
  getBatchYears,
  getImportHistory,
  downloadErrorReport,
};