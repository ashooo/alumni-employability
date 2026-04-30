const { PrismaClient } = require('../generated/client');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const { createPlaceholderPasswordHash } = require('../utils/refactorAuth');

const COMPETENCY_FILE = path.resolve(__dirname, '../../ml/data/competency_compilation.csv');
const ALUMNI_DATA_FILE = path.resolve(__dirname, '../../ml/data/processed/student-dataset-merged.csv');

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Donald', 'Sandra', 'Mark', 'Ashley',
  'Paul', 'Dorothy', 'Steven', 'Kimberly', 'Andrew', 'Emily', 'Kenneth', 'Donna',
  'Joshua', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts'
];

async function clearData() {
  console.log('Clearing existing data for a fresh start...');
  
  // Delete in order of dependencies to avoid foreign key violations
  await prisma.mlPrediction.deleteMany({});
  await prisma.followupSchedule.deleteMany({});
  await prisma.employmentOutcome.deleteMany({});
  await prisma.surveyAnswer.deleteMany({});
  await prisma.submissionCompetency.deleteMany({});
  
  // Handle self-referencing foreign keys in SurveySubmission
  await prisma.surveySubmission.updateMany({
    data: { 
      trigger_submission_id: null,
      parent_submission_id: null 
    }
  });
  await prisma.surveySubmission.deleteMany({});
  
  await prisma.academicSnapshot.deleteMany({});
  await prisma.alumniProfile.deleteMany({});
  
  // Also clear audit logs that might reference users
  await prisma.auditLog.deleteMany({});
  await prisma.userNotification.deleteMany({});
  await prisma.notification.deleteMany({});
  
  await prisma.user.deleteMany({ 
    where: { 
      role: { in: ['ALUMNI', 'ADMIN', 'SUPERADMIN'] } 
    } 
  });
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
  const colleges = [{ name: 'College of Computer Studies', code: 'CCS' }, { name: 'College of Business and Accountancy', code: 'CBA' }];
  for (const c of colleges) await prisma.college.upsert({ where: { code: c.code }, update: {}, create: { name: c.name, code: c.code } });
  const ccs = await prisma.college.findUnique({ where: { code: 'CCS' } });
  const cba = await prisma.college.findUnique({ where: { code: 'CBA' } });
  const programs = [
    { name: 'Bachelor of Science in Information Technology', code: 'BSIT', college_id: ccs.id },
    { name: 'Bachelor of Science in Computer Science', code: 'BSCS', college_id: ccs.id },
    { name: 'Bachelor of Science in Business Administration', code: 'BSBA', college_id: cba.id },
    { name: 'BSBA-Entrepreneurship', code: 'BSBA-ENTREP', college_id: cba.id }
  ];
  for (const p of programs) await prisma.program.upsert({ where: { code: p.code }, update: {}, create: { name: p.name, code: p.code, college_id: p.college_id } });
}

async function seedHistoricalAlumni() {
  console.log('Seeding historical alumni data...');
  if (!fs.existsSync(ALUMNI_DATA_FILE)) return;

  const workbook = xlsx.readFile(ALUMNI_DATA_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  const programs = await prisma.program.findMany();
  const programIdMap = Object.fromEntries(programs.map(p => [p.code, p.id]));
  const defaultProgramId = programIdMap['BSIT'];
  const degreeMap = { 'BSIT': 'BSIT', 'BSCS': 'BSCS', 'BSBA-Entrepreneurship': 'BSBA-ENTREP', 'BSBA': 'BSBA' };


  // Historical Template
  const historicalTemplate = await prisma.surveyTemplate.upsert({
    where: { template_key: 'historical_import' },
    update: {},
    create: { template_key: 'historical_import', name: 'Historical Data Import', kind: 'FOLLOWUP', path_key: 'FOLLOWUP', is_active: false }
  });

  console.log(`Processing ${rows.length} records...`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Correct ID format: 25-0XXXX
    const studentId = `25-${String(i + 1).padStart(5, '0')}`;
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const programCode = degreeMap[row.Degree] || 'BSIT';
    const programId = programIdMap[programCode] || defaultProgramId;
    const isEmployable = row.Employability === 'Employable';

    try {
      const passwordHash = await createPlaceholderPasswordHash(studentId);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: studentId,
            password_hash: passwordHash,
            role: 'ALUMNI',
            email: `${studentId.replace('-', '')}@example.com`,
            first_name: firstName,
            last_name: lastName
          }
        });

        const profile = await tx.alumniProfile.create({
          data: {
            user_id: user.id,
            student_id: studentId,
            batch_year: parseInt(row['Year Graduated']) || 2020,
            current_program_id: programId,
            lifecycle_status: 'PENDING'
          }
        });

        const snapshot = await tx.academicSnapshot.create({
          data: {
            alumni_profile: { connect: { id: profile.id } },
            program: { connect: { id: programId } },
            gender: row.Gender || 'Other',
            age: parseInt(row.Age) || 22,
            year_graduated: parseInt(row['Year Graduated']) || 2020,
            cgpa: parseFloat(row.CGPA) || 0,
            prof_grade: parseFloat(row['Average Prof Grade']) || 0,
            elec_grade: parseFloat(row['Average Elec Grade']) || 0,
            ojt_grade: parseFloat(row['OJT Grade']) || 0,
            leader_pos: row['Leadership POS'] === 'Yes',
            act_member_pos: row['Act Member POS'] === 'Yes',
            soft_skills_ave: parseFloat(row['Soft Skills Ave']) || 0,
            hard_skills_ave: parseFloat(row['Hard Skills Ave']) || 0,
            is_employable: isEmployable // Store the label directly
          }
        });

        const submission = await tx.surveySubmission.create({
          data: {
            alumni_profile: { connect: { id: profile.id } },
            academic_snapshot: { connect: { id: snapshot.id } },
            template: { connect: { id: historicalTemplate.id } },
            branch_path: 'FOLLOWUP',
            status: 'COMPLETED',
            submitted_at: new Date(`${row['Year Graduated'] || 2020}-01-01`)
          }
        });

        if (row.Employability) {
          await tx.employmentOutcome.create({
            data: {
              alumni_profile: { connect: { id: profile.id } },
              submission: { connect: { id: submission.id } },
              employment_status: isEmployable ? 'EMPLOYED' : 'UNEMPLOYED',
              outcome_date: new Date(`${row['Year Graduated'] || 2020}-01-01`)
            }
          });
        }
      });
    } catch (err) {
      if (!err.message.includes('Unique constraint')) console.error(`Error seeding ${studentId}:`, err.message);
    }
    if ((i + 1) % 100 === 0) console.log(`Seeded ${i + 1} alumni...`);
  }
}

async function main() {
  try {
    await clearData();
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
