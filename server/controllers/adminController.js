const db = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');

// Import alumni from Excel with history and transaction - DYNAMIC version
const importAlumni = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    
    // Get all sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`Found ${sheetNames.length} sheets:`, sheetNames);

    let allData = [];
    
    // Loop through each sheet and collect data
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = xlsx.utils.sheet_to_json(worksheet);
      
      // Add sheet name to each row for tracking
      const dataWithSheetInfo = sheetData.map(row => ({
        ...row,
        _sheet: sheetName
      }));
      
      allData = [...allData, ...dataWithSheetInfo];
      console.log(`Sheet "${sheetName}" has ${sheetData.length} rows`);
    }

    console.log(`Total rows across all sheets: ${allData.length}`);

    const results = {
      total: allData.length,
      success: 0,
      failed: 0,
      errors: [],
      sheets: sheetNames.map(name => ({ name, rows: 0 }))
    };

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Create import history
      const [historyResult] = await db.query(
        `INSERT INTO import_history 
         (filename, uploaded_by, total_records, success_count, failed_count, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.file.originalname, req.user.id, allData.length, 0, 0, 'pending']
      );
      const importId = historyResult.insertId;

      // Cache for colleges and programs to avoid duplicate lookups
      const collegeCache = new Map(); // key: college name -> college id
      const programCache = new Map(); // key: program name -> program id

      // Process each row from all sheets
      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        try {
          // Map Excel columns to database fields
          const studentData = {
            student_id: row['Student ID'] || row['student_id'] || row['ID'] || row['id'],
            first_name: row['First Name'] || row['first_name'] || row['FirstName'],
            last_name: row['Last Name'] || row['last_name'] || row['LastName'],
            middle_name: row['Middle Name'] || row['middle_name'] || row['MiddleName'] || null,
            suffix: row['Suffix'] || row['suffix'] || null,
            email: row['Email'] || row['email'] || null,
            college_name: row['College'] || row['college'], // College column
            college_code: row['Code'] || row['code'],       // College code column
            program_name: row['Program'] || row['program'] || row['Course'] || row['course'],
            batch_year: row['Batch Year'] || row['batch_year'] || row['Year'] || row['year'],
            sheet_name: row._sheet
          };

          // Validate required fields
          if (!studentData.student_id || !studentData.first_name || !studentData.last_name || 
              !studentData.program_name || !studentData.batch_year || !studentData.college_name) {
            throw new Error(`Missing required fields. Got: ${JSON.stringify(studentData)}`);
          }

          // ========== CREATE OR GET COLLEGE ==========
          let collegeId = collegeCache.get(studentData.college_name);
          
          if (!collegeId) {
            // Check if college already exists in database
            const [existingCollege] = await db.query(
              'SELECT id FROM colleges WHERE name = ? OR code = ?',
              [studentData.college_name, studentData.college_code || studentData.college_name]
            );

            if (existingCollege.length > 0) {
              collegeId = existingCollege[0].id;
            } else {
              // Create new college
              const collegeCode = studentData.college_code || 
                                 studentData.college_name.substring(0, 10).toUpperCase().replace(/\s+/g, '_');
              
              const [newCollege] = await db.query(
                `INSERT INTO colleges (name, code, description) 
                 VALUES (?, ?, ?)`,
                [studentData.college_name, collegeCode, `Imported from Excel`]
              );
              collegeId = newCollege.insertId;
            }
            
            // Store in cache
            collegeCache.set(studentData.college_name, collegeId);
          }

          // ========== CREATE OR GET PROGRAM ==========
          let programId = programCache.get(studentData.program_name);
          
          if (!programId) {
            // Check if program already exists
            const [existingProgram] = await db.query(
              'SELECT id FROM programs WHERE name = ?',
              [studentData.program_name]
            );

            if (existingProgram.length > 0) {
              programId = existingProgram[0].id;
              
              // Update program's college_id if needed
              await db.query(
                `UPDATE programs SET college_id = ? WHERE id = ? AND college_id != ?`,
                [collegeId, programId, collegeId]
              );
            } else {
              // Create new program
              const programCode = studentData.program_name.substring(0, 20).toUpperCase().replace(/\s+/g, '_');
              
              const [newProgram] = await db.query(
                `INSERT INTO programs (name, code, college_id, description) 
                 VALUES (?, ?, ?, ?)`,
                [studentData.program_name, programCode, collegeId, `Imported from Excel`]
              );
              programId = newProgram.insertId;
            }
            
            // Store in cache
            programCache.set(studentData.program_name, programId);
          }

          // ========== CREATE OR UPDATE ALUMNI RECORD ==========
          // Check if user account exists
          const [userExists] = await db.query(
            'SELECT id FROM user WHERE username = ?',
            [studentData.student_id]
          );
          const status = userExists.length > 0 ? 'active' : 'inactive';

          // Check if student exists in alumni_records
          const [existing] = await db.query(
            'SELECT id FROM alumni_records WHERE student_id = ?',
            [studentData.student_id]
          );

          if (existing.length > 0) {
            // Update existing record
            await db.query(
              `UPDATE alumni_records SET 
               first_name = ?, last_name = ?, middle_name = ?, suffix = ?,
               email = ?, program_id = ?, batch_year = ?, status = ?
               WHERE student_id = ?`,
              [studentData.first_name, studentData.last_name, studentData.middle_name,
               studentData.suffix, studentData.email, programId,
               studentData.batch_year, status, studentData.student_id]
            );
          } else {
            // Insert new record
            await db.query(
              `INSERT INTO alumni_records 
               (student_id, first_name, last_name, middle_name, suffix, email, program_id, batch_year, status, survey_status, imported_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [studentData.student_id, studentData.first_name, studentData.last_name,
               studentData.middle_name, studentData.suffix, studentData.email,
               programId, studentData.batch_year, status, 'pending']
            );
          }

          results.success++;
          
          // Update sheet stats
          const sheetIndex = sheetNames.indexOf(studentData.sheet_name);
          if (sheetIndex !== -1) {
            results.sheets[sheetIndex].rows = (results.sheets[sheetIndex].rows || 0) + 1;
          }
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            sheet: row._sheet || 'Unknown',
            data: row,
            error: error.message
          });

          // Save individual row error to import_errors table
          await db.query(
            `INSERT INTO import_errors (import_id, row_number, error, raw_data) 
             VALUES (?, ?, ?, ?)`,
            [importId, i + 1, error.message, JSON.stringify(row)]
          );
        }
      }

      // Update import history with final counts
      const finalStatus = results.failed === 0 ? 'completed' : 
                          results.success > 0 ? 'partial' : 'failed';

      await db.query(
        `UPDATE import_history 
         SET success_count = ?, failed_count = ?, status = ? 
         WHERE id = ?`,
        [results.success, results.failed, finalStatus, importId]
      );

      // Commit transaction
      await db.query('COMMIT');

      // Log summary
      console.log('Import completed:');
      console.log(`- Colleges created/found: ${collegeCache.size}`);
      console.log(`- Programs created/found: ${programCache.size}`);
      console.log(`- Alumni records: ${results.success} successful, ${results.failed} failed`);

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      results,
      message: `Processed ${allData.length} rows from ${sheetNames.length} sheets`
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import alumni data' });
  }
};

// Get all alumni records (for admin table)
const getAlumniRecords = async (req, res) => {
  try {
    const { search, program, batch, college } = req.query;
    
    let query = `
      SELECT 
        ar.id, ar.student_id, 
        CONCAT(ar.first_name, ' ', ar.last_name) as name,
        p.name as program,
        p.id as program_id,
        c.name as college,
        c.id as college_id,
        ar.batch_year as batch, 
        ar.status, 
        ar.survey_status,
        ar.email
      FROM alumni_records ar
      LEFT JOIN programs p ON ar.program_id = p.id
      LEFT JOIN colleges c ON p.college_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (ar.student_id LIKE ? OR ar.first_name LIKE ? OR ar.last_name LIKE ? OR CONCAT(ar.first_name, ' ', ar.last_name) LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (program && program !== 'all') {
      query += ` AND p.id = ?`;
      params.push(program);
    }

    if (college && college !== 'all') {
      query += ` AND c.id = ?`;
      params.push(college);
    }

    if (batch && batch !== 'all') {
      query += ` AND ar.batch_year = ?`;
      params.push(batch);
    }

    query += ` ORDER BY ar.batch_year DESC, ar.last_name ASC`;

    const [records] = await db.query(query, params);
    res.json(records);

  } catch (error) {
    console.error('Get alumni error:', error);
    res.status(500).json({ error: 'Failed to fetch alumni records' });
  }
};

// Check if student exists in alumni_records (for activation)
const checkAlumniRecord = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const [records] = await db.query(
      `SELECT 
        ar.student_id, ar.first_name, ar.last_name, ar.middle_name, ar.suffix,
        CONCAT(ar.first_name, ' ', ar.last_name) as full_name,
        p.name as program,
        ar.batch_year, ar.status
       FROM alumni_records ar
       LEFT JOIN programs p ON ar.program_id = p.id
       WHERE ar.student_id = ?`,
      [studentId]
    );

    if (records.length === 0) return res.json({ exists: false });

    const [users] = await db.query(
      'SELECT id FROM user WHERE username = ?',
      [studentId]
    );

    res.json({ 
      exists: true, 
      hasAccount: users.length > 0, 
      record: records[0] 
    });

  } catch (error) {
    console.error('Check alumni error:', error);
    res.status(500).json({ error: 'Failed to check alumni record' });
  }
};

// Get programs list (from programs table)
const getPrograms = async (req, res) => {
  try {
    const { collegeId } = req.query;
    
    let query = `
      SELECT p.*, c.name as college_name, c.code as college_code
      FROM programs p
      LEFT JOIN colleges c ON p.college_id = c.id
    `;
    const params = [];

    if (collegeId && collegeId !== 'all') {
      query += ` WHERE p.college_id = ?`;
      params.push(collegeId);
    }

    query += ` ORDER BY p.name ASC`;

    const [programs] = await db.query(query, params);
    res.json(programs);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
};

// Get batch years list
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

// Get import history
const getImportHistory = async (req, res) => {
  try {
    const [history] = await db.query(
      `SELECT 
        ih.*,
        u.username as uploaded_by
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

// Download error report for specific import
const downloadErrorReport = async (req, res) => {
  try {
    const { importId } = req.params;
    
    const [errors] = await db.query(
      'SELECT * FROM import_errors WHERE import_id = ?',
      [importId]
    );

    if (errors.length === 0) {
      return res.status(404).json({ error: 'No errors found for this import' });
    }

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
  getAlumniRecords,
  checkAlumniRecord,
  getPrograms,
  getBatchYears,
  getImportHistory,
  downloadErrorReport
};