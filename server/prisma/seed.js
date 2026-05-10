const { PrismaClient } = require('../generated/client');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { createPlaceholderPasswordHash } = require('../utils/refactorAuth');

const COMPETENCY_FILE = path.resolve(__dirname, '../../ml/data/competency_compilation.csv');
const ALUMNI_DATA_FILE = process.env.ALUMNI_DATA_FILE
  ? path.resolve(__dirname, process.env.ALUMNI_DATA_FILE)
  : path.resolve(__dirname, '../../ml/data/employability/combined_employability_v2.csv');

const SYNTHETIC_FIRST_NAMES = [
  'Adrian', 'Aileen', 'Aira', 'Albert', 'Aldrin', 'Alexa', 'Alexis', 'Allen', 'Alvin', 'Amanda',
  'Andrea', 'Angela', 'Angelica', 'Anthony', 'Aris', 'Arthur', 'Ashley', 'Audrey', 'Ava', 'Bea',
  'Beatrice', 'Benjamin', 'Bianca', 'Brandon', 'Bryan', 'Camille', 'Carla', 'Carlo', 'Catherine', 'Cedric',
  'Charlene', 'Charles', 'Chester', 'Chloe', 'Christian', 'Christine', 'Claire', 'Clarisse', 'Coleen', 'Daisy',
  'Daniel', 'Danielle', 'Daphne', 'Darren', 'David', 'Denise', 'Derrick', 'Diana', 'Dominic', 'Donna',
  'Dwayne', 'Elaine', 'Elijah', 'Eliza', 'Ella', 'Emerson', 'Emmanuel', 'Enzo', 'Erica', 'Erika',
  'Ethan', 'Eugene', 'Faith', 'Felix', 'Frances', 'Franco', 'Franz', 'Gabriel', 'Gail', 'Gavin',
  'Gelo', 'Gene', 'Geoffrey', 'Gian', 'Gina', 'Grace', 'Harvey', 'Hazel', 'Heidi', 'Ian',
  'Iris', 'Isaac', 'Isabel', 'Janelle', 'Janine', 'Jasper', 'Jayson', 'Jean', 'Jefferson', 'Jenna',
  'Jericho', 'Jerome', 'Jessica', 'Jillian', 'Joanna', 'John', 'Jonas', 'Jordan', 'Jose', 'Joshua',
  'Joy', 'Judith', 'Julia', 'Justin', 'Karen', 'Karla', 'Karl', 'Kate', 'Kathryn', 'Katrina',
  'Kevin', 'Kim', 'Kyle', 'Lance', 'Lara', 'Lauren', 'Leah', 'Leo', 'Lester', 'Liam',
  'Liezl', 'Liza', 'Louis', 'Louise', 'Lucas', 'Lucille', 'Luis', 'Luna', 'Mabel', 'Marco',
  'Maria', 'Mariel', 'Marvin', 'Mason', 'Matteo', 'Maxine', 'Megan', 'Melanie', 'Mia', 'Miguel',
  'Mika', 'Mikaela', 'Mary', 'Monica', 'Nadine', 'Nathan', 'Nathaniel', 'Neil', 'Nicole', 'Nina',
  'Noah', 'Olivia', 'Oscar', 'Patricia', 'Paolo', 'Paul', 'Paula', 'Phoebe', 'Quentin', 'Rafael',
  'Raquel', 'Raymond', 'Reina', 'Renz', 'Rica', 'Rico', 'Rina', 'Riza', 'Roberto', 'Rochelle',
  'Rogelio', 'Rona', 'Ronald', 'Rose', 'Rowena', 'Ryan', 'Sabrina', 'Samantha', 'Samson', 'Sarah',
  'Sean', 'Shane', 'Sheila', 'Sophia', 'Stella', 'Stephen', 'Teresa', 'Thea', 'Timothy', 'Trisha',
  'Vanessa', 'Vera', 'Vincent', 'Violet', 'Wayne', 'Wendy', 'Willard', 'Xander', 'Yana', 'Zachary'
];
const SYNTHETIC_LAST_NAMES = [
  'Abad', 'Aguilar', 'Alcantara', 'Alfonso', 'Alvarez', 'Aquino', 'Arevalo', 'Atienza', 'Bacani', 'Bautista',
  'Beltran', 'Bernardo', 'Bonifacio', 'Buenaventura', 'Cabrera', 'Calderon', 'Camacho', 'Campos', 'Candelaria', 'Capistrano',
  'Carreon', 'Castillo', 'Castro', 'Cervantes', 'Chavez', 'Concepcion', 'Contreras', 'Corpuz', 'Cortez', 'Cruz',
  'Cuevas', 'Dalisay', 'Dela Cruz', 'Del Rosario', 'Diaz', 'Domingo', 'Duran', 'Enriquez', 'Escobar', 'Espinosa',
  'Estrella', 'Evangelista', 'Fabian', 'Fajardo', 'Fernandez', 'Flores', 'Franco', 'Fuentes', 'Garcia', 'Gonzales',
  'Guerrero', 'Gutierrez', 'Hernandez', 'Ilagan', 'Jacinto', 'Jimenez', 'Labrador', 'Lacsamana', 'Lao', 'Legaspi',
  'Lim', 'Llamas', 'Lopez', 'Luna', 'Mabini', 'Macapagal', 'Magsaysay', 'Malvar', 'Manalo', 'Mendoza',
  'Mercado', 'Miranda', 'Navarro', 'Nolasco', 'Ocampo', 'Ortega', 'Pacheco', 'Padilla', 'Palma', 'Panganiban',
  'Pascual', 'Pineda', 'Quinto', 'Ramos', 'Reyes', 'Rivera', 'Robles', 'Rodriguez', 'Rojas', 'Romero',
  'Rosales', 'Rosario', 'Roxas', 'Salazar', 'Salvador', 'Sanchez', 'Santos', 'Soriano', 'Suarez', 'Tolentino',
  'Torres', 'Trinidad', 'Valdez', 'Valencia', 'Vargas', 'Velasco', 'Ventura', 'Vergara', 'Villanueva', 'Yap'
];

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function parseNumericOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function parseIntegerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

const RESERVED_ALUMNI_COLUMNS = new Set([
  'Student Number',
  'Name',
  'First Name',
  'Middle Name',
  'Last Name',
  'Suffix',
  'first_name',
  'middle_name',
  'last_name',
  'suffix',
  'Gender',
  'Age',
  'Program',
  'Degree',
  'Year Graduated',
  'CGPA',
  'Average Prof Grade',
  'Average Elec Grade',
  'OJT Grade',
  'Leadership POS',
  'Act Member POS',
  'Soft Skills Ave',
  'Hard Skills Ave',
  'Board Exam',
  'Employability',
  'Employability Reason',
  'Internship Experience',
  'Certifications',
  'source_file'
]);

function normalizeSkillName(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSnapshotSkills(row) {
  const skillEntries = [];
  for (const [columnName, rawValue] of Object.entries(row || {})) {
    if (RESERVED_ALUMNI_COLUMNS.has(columnName)) continue;
    const skillName = normalizeSkillName(columnName);
    if (!skillName) continue;

    const numericValue = parseNumericOrNull(rawValue);
    if (numericValue === null) continue;

    skillEntries.push({
      skill_name: skillName.slice(0, 150),
      skill_value: numericValue
    });
  }

  return skillEntries;
}

async function clearData() {
  console.log('Clearing existing data for a fresh start...');

  const safeDelete = async (label, fn) => {
    try {
      await fn();
    } catch (err) {
      if (err && err.code === 'P2021') {
        console.log(`Skipping ${label}: backing table is missing in current DB.`);
        return;
      }
      throw err;
    }
  };

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await safeDelete('mlPrediction', () => prisma.mlPrediction.deleteMany({}));
    await safeDelete('followupSchedule', () => prisma.followupSchedule.deleteMany({}));
    await safeDelete('employmentOutcome', () => prisma.employmentOutcome.deleteMany({}));
    await safeDelete('surveyAnswer', () => prisma.surveyAnswer.deleteMany({}));
    await safeDelete('submissionCompetency', () => prisma.submissionCompetency.deleteMany({}));
    await safeDelete('surveySubmission', () => prisma.surveySubmission.deleteMany({}));
    await safeDelete('academicSnapshotSkill', () => prisma.academicSnapshotSkill.deleteMany({}));
    await safeDelete('academicSnapshot', () => prisma.academicSnapshot.deleteMany({}));
    await safeDelete('alumniProfile', () => prisma.alumniProfile.deleteMany({}));
    await safeDelete('auditLog', () => prisma.auditLog.deleteMany({}));
    await safeDelete('userNotification', () => prisma.userNotification.deleteMany({}));
    await safeDelete('notification', () => prisma.notification.deleteMany({}));
    await safeDelete('user', () => prisma.user.deleteMany({
      where: {
        role: 'ALUMNI'
      }
    }));
  } finally {
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function seedAdmins() {
  console.log('Seeding administrative accounts...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const superHash = await bcrypt.hash('superadmin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password_hash: adminHash, role: 'ADMIN' },
    create: {
      username: 'admin',
      password_hash: adminHash,
      role: 'ADMIN',
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@example.com'
    }
  });

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { password_hash: superHash, role: 'SUPERADMIN' },
    create: {
      username: 'superadmin',
      password_hash: superHash,
      role: 'SUPERADMIN',
      first_name: 'Super',
      last_name: 'Admin',
      email: 'superadmin@example.com'
    }
  });
}

async function seedCompetencies() {
  console.log('Seeding competencies...');
  if (!fs.existsSync(COMPETENCY_FILE)) return;
  const workbook = xlsx.readFile(COMPETENCY_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  const uniqueRecords = new Map();
  const COLUMN_KIND_MAP = { KNOWLEDGE: 'KNOWLEDGE', ABILITIES: 'ABILITY', INTERESTS: 'INTEREST', 'TECHNOLOGY-SKILLS': 'TECHNOLOGY' };
  const SOFT_SKILLS = new Set(['Active Learning', 'Active Listening', 'Complex Problem Solving', 'Coordination', 'Critical Thinking', 'Instructing', 'Judgment and Decision Making', 'Learning Strategies', 'Management of Financial Resources', 'Management of Material Resources', 'Management of Personnel Resources', 'Monitoring', 'Negotiation', 'Persuasion', 'Reading Comprehension', 'Service Orientation', 'Social Perceptiveness', 'Speaking', 'Time Management', 'Writing']);
  const HARD_SKILLS = new Set(['Equipment Maintenance', 'Equipment Selection', 'Installation', 'Mathematics', 'Operation and Control', 'Operations Analysis', 'Operations Monitoring', 'Programming', 'Quality Control Analysis', 'Repairing', 'Science', 'Systems Analysis', 'Systems Evaluation', 'Technology Design', 'Troubleshooting']);

  for (const row of rows) {
    for (const [columnName, kind] of Object.entries(COLUMN_KIND_MAP)) {
      const val = String(row[columnName] || '').trim();
      if (val && val.length <= 150) {
        const key = `${kind}:${val.toLowerCase()}`;
        if (!uniqueRecords.has(key)) uniqueRecords.set(key, { name: val, kind, source: 'seed', is_active: true });
      }
    }
    const skillVal = String(row.SKILLS || '').trim();
    if (skillVal && skillVal.length <= 150) {
      let kind = null;
      if (SOFT_SKILLS.has(skillVal)) kind = 'SOFT_SKILL';
      else if (HARD_SKILLS.has(skillVal)) kind = 'HARD_SKILL';
      if (kind) {
        const key = `${kind}:${skillVal.toLowerCase()}`;
        if (!uniqueRecords.has(key)) uniqueRecords.set(key, { name: skillVal, kind, source: 'seed', is_active: true });
      }
    }
  }
  const records = Array.from(uniqueRecords.values());
  const CHUNK_SIZE = 100;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    await prisma.competency.createMany({ data: records.slice(i, i + CHUNK_SIZE), skipDuplicates: true });
  }
  console.log(`Successfully seeded ${records.length} competencies.`);
}

async function seedCollegesAndPrograms() {
  console.log('Seeding colleges and programs...');
  const colleges = [
    { name: 'College of Computer Studies', code: 'CCS' },
    { name: 'College of Business and Accountancy', code: 'CBA' },
    { name: 'College of Arts and Sciences', code: 'CAS' },
    { name: 'College of International Hospitality Management', code: 'CIHM' },
    { name: 'College of Engineering', code: 'COE' },
    { name: 'College of Nursing', code: 'CON' },
    { name: 'College of Education', code: 'COED' }
  ];
  for (const c of colleges) await prisma.college.upsert({ where: { code: c.code }, update: {}, create: { name: c.name, code: c.code } });
  const ccs = await prisma.college.findUnique({ where: { code: 'CCS' } });
  const cba = await prisma.college.findUnique({ where: { code: 'CBA' } });
  const cas = await prisma.college.findUnique({ where: { code: 'CAS' } });
  const cihm = await prisma.college.findUnique({ where: { code: 'CIHM' } });
  const coe = await prisma.college.findUnique({ where: { code: 'COE' } });
  const con = await prisma.college.findUnique({ where: { code: 'CON' } });
  const coed = await prisma.college.findUnique({ where: { code: 'COED' } });
  const programs = [
    { name: 'Bachelor of Science in Business Administration major in Entrepreneurship', code: 'BSBA_ENTREP', college_id: cba.id },
    { name: 'Bachelor of Science in Business Administration major in Marketing Management', code: 'BSBA_MARKETING', college_id: cba.id },
    { name: 'Bachelor of Science in Business Administration major in Financial Management', code: 'BSBA_FINANCE', college_id: cba.id },
    { name: 'Bachelor of Science in Accountancy', code: 'BSA', college_id: cba.id },
    { name: 'Bachelor of Arts in Psychology', code: 'BAP', college_id: cas.id },
    { name: 'Bachelor of Science in Hospitality Management', code: 'BSHM', college_id: cihm.id },
    { name: 'Bachelor of Science in Computer Science', code: 'BSCS', college_id: ccs.id },
    { name: 'Bachelor of Science in Information Technology', code: 'BSIT', college_id: ccs.id },
    { name: 'Bachelor of Science in Electronics Engineering', code: 'BSECE', college_id: coe.id },
    { name: 'Bachelor of Science in Nursing', code: 'BSN', college_id: con.id },
    { name: 'Bachelor of Secondary Education major in Filipino', code: 'BSED_FILIPINO', college_id: coed.id },
    { name: 'Bachelor of Secondary Education major in English', code: 'BSED_ENGLISH', college_id: coed.id }
  ];
  for (const p of programs) await prisma.program.upsert({ where: { code: p.code }, update: {}, create: { name: p.name, code: p.code, college_id: p.college_id } });
}

async function seedHistoricalAlumni() {
  console.log('Seeding historical alumni data...');
  if (!fs.existsSync(ALUMNI_DATA_FILE)) {
    console.log(`Alumni data file not found: ${ALUMNI_DATA_FILE}`);
    return;
  }

  const workbook = xlsx.readFile(ALUMNI_DATA_FILE);
  const targetSheetName = workbook.SheetNames.includes('Alumni Data') ? 'Alumni Data' : workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);
  const programs = await prisma.program.findMany();
  const programIdMap = Object.fromEntries(programs.map(p => [p.code, p.id]));
  const degreeMap = {
    // Canonical dataset terms
    'BSA': 'BSA',
    'BSBA ENTREPRENEURSHIP': 'BSBA_ENTREP',
    'BSBA MARKETING': 'BSBA_MARKETING',
    'BSBA FINANCE': 'BSBA_FINANCE',
    'BAP': 'BAP',
    'BSHM': 'BSHM',
    'BSEE': 'BSECE',
    'BSECE': 'BSECE',
    'BSCS': 'BSCS',
    'BSED ENGLISH': 'BSED_ENGLISH',
    'BSED FILIPINO': 'BSED_FILIPINO',
    'BSIT': 'BSIT',
    'BSN': 'BSN',
    // Compatibility aliases
    'BSBA-ENTREPRENEURSHIP': 'BSBA_ENTREP',
    'BSBA ENTREPRENEURSHIP ': 'BSBA_ENTREP',
    'BSBA-MARKETING': 'BSBA_MARKETING',
    'BSBA-FINANCE': 'BSBA_FINANCE',
    'BSBA FINANCIAL MANAGEMENT': 'BSBA_FINANCE',
    'BSED-ENGLISH': 'BSED_ENGLISH',
    'BSED-FILIPINO': 'BSED_FILIPINO',
    'BS IN ENTREPRENEURSHIP': 'BSBA_ENTREP',
    'BS IN MARKETING MANAGEMENT': 'BSBA_MARKETING',
    'BS IN FINANCIAL MANAGEMENT': 'BSBA_FINANCE'
  };


  // Historical Template
  const historicalTemplate = await prisma.surveyTemplate.upsert({
    where: { template_key: 'historical_import' },
    update: {},
    create: { template_key: 'historical_import', name: 'Historical Data Import', kind: 'FOLLOWUP', path_key: 'FOLLOWUP', is_active: false }
  });

  console.log(`Processing ${rows.length} records...`);

  let skippedRows = 0;
  const unmappedPrograms = new Set();

  for (const row of rows) {
    const rawProgram = String(row.Program || row.Degree || '').trim().toUpperCase();
    if (!degreeMap[rawProgram]) {
      unmappedPrograms.add(rawProgram || '(blank)');
    }
  }
  if (unmappedPrograms.size > 0) {
    throw new Error(`Dataset contains unmapped program/degree values: ${Array.from(unmappedPrograms).sort().join(', ')}`);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const studentId = String(row['Student Number'] || '').trim() || `SYN-${String(i + 1).padStart(6, '0')}`;
    const fallbackFirstName = SYNTHETIC_FIRST_NAMES[hashString(`${studentId}:first`) % SYNTHETIC_FIRST_NAMES.length];
    const fallbackLastName = SYNTHETIC_LAST_NAMES[hashString(`${studentId}:last`) % SYNTHETIC_LAST_NAMES.length];
    const firstName = String(row['First Name'] || row.first_name || '').trim() || fallbackFirstName;
    const middleName = String(row['Middle Name'] || row.middle_name || '').trim() || null;
    const lastName = String(row['Last Name'] || row.last_name || '').trim() || fallbackLastName;
    const suffix = String(row['Suffix'] || row.suffix || '').trim() || null;
    const rawProgram = String(row.Program || row.Degree || '').trim().toUpperCase();
    const programCode = degreeMap[rawProgram];
    const programId = programCode ? programIdMap[programCode] : null;
    const isEmployable = row.Employability === 'Employable';
    const yearGraduated = parseInt(row['Year Graduated'], 10);
    const snapshotSkills = extractSnapshotSkills(row);
    if (!Number.isFinite(yearGraduated)) {
      skippedRows += 1;
      continue;
    }
    if (!programId) throw new Error(`Mapped program code missing in DB: ${programCode}`);

    try {
      const passwordHash = await createPlaceholderPasswordHash(studentId);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.upsert({
          where: { username: studentId },
          update: {
            password_hash: passwordHash,
            role: 'ALUMNI',
            email: `${studentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@alumni.local`,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix
          },
          create: {
            username: studentId,
            password_hash: passwordHash,
            role: 'ALUMNI',
            email: `${studentId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@alumni.local`,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix
          }
        });

        const profile = await tx.alumniProfile.upsert({
          where: { user_id: user.id },
          update: {
            student_id: studentId,
            batch_year: yearGraduated,
            current_program_id: programId,
            lifecycle_status: 'PENDING'
          },
          create: {
            user_id: user.id,
            student_id: studentId,
            batch_year: yearGraduated,
            current_program_id: programId,
            lifecycle_status: 'PENDING'
          }
        });

        let snapshot = await tx.academicSnapshot.findFirst({
          where: {
            alumni_profile_id: profile.id,
            program_id: programId,
            year_graduated: yearGraduated
          }
        });

        if (!snapshot) {
          snapshot = await tx.academicSnapshot.create({
            data: {
              alumni_profile: { connect: { id: profile.id } },
              program: { connect: { id: programId } },
              gender: String(row.Gender || '').trim() || null,
              age: parseNumericOrNull(row.Age),
              year_graduated: yearGraduated,
              cgpa: parseNumericOrNull(row.CGPA),
              prof_grade: parseNumericOrNull(row['Average Prof Grade']),
              elec_grade: parseNumericOrNull(row['Average Elec Grade']),
              ojt_grade: parseNumericOrNull(row['OJT Grade']),
              leader_pos: parseIntegerOrNull(row['Leadership POS']),
              act_member_pos: parseIntegerOrNull(row['Act Member POS']),
              soft_skills_ave: parseNumericOrNull(row['Soft Skills Ave']),
              hard_skills_ave: parseNumericOrNull(row['Hard Skills Ave']),
              internship_experience: parseNumericOrNull(row['Internship Experience']),
              certifications: parseIntegerOrNull(row['Certifications']),
              board_exam: parseIntegerOrNull(row['Board Exam']),
              is_employable: isEmployable
            }
          });
        } else {
          snapshot = await tx.academicSnapshot.update({
            where: { id: snapshot.id },
            data: {
              gender: String(row.Gender || '').trim() || null,
              age: parseNumericOrNull(row.Age),
              cgpa: parseNumericOrNull(row.CGPA),
              prof_grade: parseNumericOrNull(row['Average Prof Grade']),
              elec_grade: parseNumericOrNull(row['Average Elec Grade']),
              ojt_grade: parseNumericOrNull(row['OJT Grade']),
              leader_pos: parseIntegerOrNull(row['Leadership POS']),
              act_member_pos: parseIntegerOrNull(row['Act Member POS']),
              soft_skills_ave: parseNumericOrNull(row['Soft Skills Ave']),
              hard_skills_ave: parseNumericOrNull(row['Hard Skills Ave']),
              internship_experience: parseNumericOrNull(row['Internship Experience']),
              certifications: parseIntegerOrNull(row['Certifications']),
              board_exam: parseIntegerOrNull(row['Board Exam']),
              is_employable: isEmployable
            }
          });
        }

        let submission = await tx.surveySubmission.findFirst({
          where: {
            alumni_profile_id: profile.id,
            academic_snapshot_id: snapshot.id,
            template_id: historicalTemplate.id
          }
        });

        if (!submission) {
          submission = await tx.surveySubmission.create({
            data: {
              alumni_profile: { connect: { id: profile.id } },
              academic_snapshot: { connect: { id: snapshot.id } },
              template: { connect: { id: historicalTemplate.id } },
              branch_path: 'FOLLOWUP',
              status: 'COMPLETED',
              submitted_at: new Date(`${yearGraduated}-01-01`)
            }
          });
        }

        if (snapshotSkills.length > 0) {
          await tx.academicSnapshotSkill.createMany({
            data: snapshotSkills.map((entry) => ({
              academic_snapshot_id: snapshot.id,
              skill_name: entry.skill_name,
              skill_value: entry.skill_value,
              source_column: null
            })),
            skipDuplicates: true
          });
        }

        if (row.Employability) {
          const existingOutcome = await tx.employmentOutcome.findFirst({
            where: {
              alumni_profile_id: profile.id,
              submission_id: submission.id
            }
          });
          if (!existingOutcome) {
            await tx.employmentOutcome.create({
              data: {
                alumni_profile: { connect: { id: profile.id } },
                submission: { connect: { id: submission.id } },
                employment_status: isEmployable ? 'EMPLOYED' : 'UNEMPLOYED',
                outcome_date: new Date(`${yearGraduated}-01-01`)
              }
            });
          }
        }
      });
    } catch (err) {
      if (!err.message.includes('Unique constraint')) console.error(`Error seeding ${studentId}:`, err.message);
    }
    if ((i + 1) % 100 === 0) console.log(`Seeded ${i + 1} alumni...`);
  }
  if (skippedRows > 0) {
    console.log(`Skipped ${skippedRows} rows due to missing required dataset identifiers/fields.`);
  }
}

async function main() {
  try {
    const skipClear = String(process.env.SKIP_CLEAR || '').trim() === '1';
    if (!skipClear) {
      await clearData();
    } else {
      console.log('SKIP_CLEAR=1 detected. Keeping existing data and appending seed rows.');
    }
    await seedAdmins();
    await seedCompetencies();
    await seedCollegesAndPrograms();
    await seedHistoricalAlumni();
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
