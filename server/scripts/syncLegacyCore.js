const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const { PrismaClient: AppPrismaClient } = require('../generated/client');
const {
  createPlaceholderPasswordHash,
  normalizeUserRoleEnum
} = require('../utils/refactorAuth');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.refactor'), override: false });
dotenv.config({ path: path.resolve(__dirname, '../.env.refactor.example'), override: false });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to read legacy data.');
}

if (!process.env.DATABASE_URL_REFACTOR) {
  throw new Error('DATABASE_URL_REFACTOR is required to write current app data.');
}

const legacySql = mysql.createPool(process.env.DATABASE_URL);

const appPrisma = new AppPrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_REFACTOR
    }
  }
});

const FALLBACK_SOFT_SKILLS = [
  'Communication',
  'Leadership',
  'Teamwork',
  'Problem Solving',
  'Time Management',
  'Adaptability',
  'Critical Thinking',
  'Work Ethic'
];

const FALLBACK_HARD_SKILLS = [
  'Programming',
  'Data Analysis',
  'Web Development',
  'Digital Marketing',
  'Networking',
  'Cybersecurity',
  'Cloud Computing',
  'Database Management',
  'Financial Accounting',
  'Project Management',
  'Technical Writing',
  'UI/UX Design'
];

const normalizeLifecycleStatus = (status) => {
  switch (String(status || '').trim().toLowerCase()) {
    case 'active':
      return 'ACTIVE';
    case 'inactive':
      return 'INACTIVE';
    case 'archived':
      return 'ARCHIVED';
    default:
      return 'PENDING';
  }
};

const normalizeCompetencyKind = (type) => {
  switch (String(type || '').trim().toLowerCase()) {
    case 'soft':
      return 'SOFT_SKILL';
    default:
      return 'HARD_SKILL';
  }
};

async function syncColleges() {
  const [colleges] = await legacySql.query(`
    SELECT id, name, code, description
    FROM colleges
    ORDER BY id ASC
  `);

  for (const college of colleges) {
    await appPrisma.college.upsert({
      where: { id: college.id },
      update: {
        name: college.name,
        code: college.code || null,
        description: college.description || null
      },
      create: {
        id: college.id,
        name: college.name,
        code: college.code || null,
        description: college.description || null
      }
    });
  }

  return colleges.length;
}

async function syncPrograms() {
  const [programs] = await legacySql.query(`
    SELECT id, name, code, description, college_id
    FROM programs
    ORDER BY id ASC
  `);

  for (const program of programs) {
    await appPrisma.program.upsert({
      where: { id: program.id },
      update: {
        name: program.name,
        code: program.code || null,
        description: program.description || null,
        college_id: program.college_id
      },
      create: {
        id: program.id,
        name: program.name,
        code: program.code || null,
        description: program.description || null,
        college_id: program.college_id
      }
    });
  }

  return programs.length;
}

async function syncUsers() {
  const [users] = await legacySql.query(`
    SELECT
      id,
      username,
      email,
      phone,
      address,
      password_hash,
      role,
      first_name,
      last_name,
      middle_name,
      suffix,
      last_login
    FROM user
    ORDER BY id ASC
  `);

  for (const user of users) {
    await appPrisma.user.upsert({
      where: { id: user.id },
      update: {
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
        password_hash: user.password_hash,
        role: normalizeUserRoleEnum(user.role),
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name || null,
        suffix: user.suffix || null,
        last_login: user.last_login || null
      },
      create: {
        id: user.id,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
        password_hash: user.password_hash,
        role: normalizeUserRoleEnum(user.role),
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name || null,
        suffix: user.suffix || null,
        last_login: user.last_login || null
      }
    });
  }

  return users.length;
}

async function syncCompetencies() {
  let skills;

  try {
    const [legacySkills] = await legacySql.query(`
      SELECT id, name, type, description
      FROM skills
      ORDER BY id ASC
    `);
    skills = legacySkills;
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }

    skills = [
      ...FALLBACK_HARD_SKILLS.map((name, index) => ({
        id: index + 1,
        name,
        type: 'hard',
        description: null
      })),
      ...FALLBACK_SOFT_SKILLS.map((name, index) => ({
        id: FALLBACK_HARD_SKILLS.length + index + 1,
        name,
        type: 'soft',
        description: null
      }))
    ];
  }

  for (const skill of skills) {
    await appPrisma.competency.upsert({
      where: { id: skill.id },
      update: {
        name: skill.name,
        kind: normalizeCompetencyKind(skill.type),
        description: skill.description || null,
        source: 'legacy.skills',
        is_active: true
      },
      create: {
        id: skill.id,
        name: skill.name,
        kind: normalizeCompetencyKind(skill.type),
        description: skill.description || null,
        source: 'legacy.skills',
        is_active: true
      }
    });
  }

  return skills.length;
}

async function syncAlumniProfiles() {
  const [alumniRecords] = await legacySql.query(`
    SELECT student_id, first_name, last_name, middle_name, suffix, email, batch_year, status, program_id
    FROM alumni_records
  `);
  let synced = 0;
  let placeholderUsersCreated = 0;

  for (const record of alumniRecords) {
    let user = await appPrisma.user.findUnique({
      where: { username: record.student_id }
    });

    if (!user) {
      let placeholderEmail = String(record.email || '').trim().toLowerCase() || null;

      if (placeholderEmail) {
        const existingEmailOwner = await appPrisma.user.findFirst({
          where: { email: placeholderEmail },
          select: { username: true }
        });

        if (existingEmailOwner && existingEmailOwner.username !== record.student_id) {
          placeholderEmail = null;
        }
      }

      user = await appPrisma.user.create({
        data: {
          username: record.student_id,
          email: placeholderEmail,
          password_hash: await createPlaceholderPasswordHash(record.student_id),
          role: 'ALUMNI',
          first_name: record.first_name,
          last_name: record.last_name,
          middle_name: record.middle_name || null,
          suffix: record.suffix || null
        }
      });

      placeholderUsersCreated += 1;
    }

    await appPrisma.alumniProfile.upsert({
      where: { user_id: user.id },
      update: {
        student_id: record.student_id,
        batch_year: record.batch_year,
        current_program_id: record.program_id || null,
        lifecycle_status: normalizeLifecycleStatus(record.status)
      },
      create: {
        user_id: user.id,
        student_id: record.student_id,
        batch_year: record.batch_year,
        current_program_id: record.program_id || null,
        lifecycle_status: normalizeLifecycleStatus(record.status)
      }
    });

    synced += 1;
  }

  return { synced, placeholderUsersCreated };
}

async function main() {
  console.log('Syncing legacy core data into the current schema...');

  const colleges = await syncColleges();
  const programs = await syncPrograms();
  const users = await syncUsers();
  const competencies = await syncCompetencies();
  const alumniProfiles = await syncAlumniProfiles();

  console.log(
    JSON.stringify(
      {
        colleges,
        programs,
        users,
        competencies,
        alumni_profiles_synced: alumniProfiles.synced,
        placeholder_users_created: alumniProfiles.placeholderUsersCreated
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await legacySql.end();
    await appPrisma.$disconnect();
  });
