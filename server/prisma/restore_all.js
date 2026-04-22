const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting comprehensive data restoration...');

  const sqlPath = path.join(__dirname, '..', '..', 'db', 'alumni_tracer.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('SQL dump not found at:', sqlPath);
    return;
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  function getInserts(tableName) {
    const regex = new RegExp(`INSERT INTO \`${tableName}\` .*?;`, 'gs');
    return sqlContent.match(regex) || [];
  }

  const tablesToRestore = [
    'user',
    'colleges',
    'programs',
    'alumni_records',
    'survey_categories',
    'survey_questions',
    'survey_versions',
    'published_surveys',
    'system_settings',
    'notifications',
    'user_notifications',
    'employment_records',
    'import_history',
    'import_errors'
  ];

  for (const table of tablesToRestore) {
    console.log(`Restoring table: ${table}...`);
    const inserts = getInserts(table);
    if (inserts.length === 0) {
        console.log(`  No inserts found for ${table} in SQL dump.`);
    }
    for (const insert of inserts) {
      try {
        await prisma.$executeRawUnsafe(insert);
      } catch (e) {
        if (!e.message.includes('Duplicate entry')) {
            console.warn(`  Warning restoring ${table}:`, e.message);
        }
      }
    }
  }

  // --- ENSURE ACTIVE SURVEYS ---
  console.log('Verifying active surveys...');
  const colleges = await prisma.college.findMany();
  for (const college of colleges) {
    const active = await prisma.publishedSurvey.findFirst({
        where: { college_id: college.id, status: 'active' }
    });
    
    if (!active) {
        console.log(`  Seeding active survey for college: ${college.name} (ID: ${college.id})`);
        await prisma.publishedSurvey.create({
            data: {
                college_id: college.id,
                version: 1, // Assume version 1 from SQL dump
                published_by: 1,
                status: 'active'
            }
        });
    }
  }

  // --- ENSURE PASSWORDS ---
  console.log('Ensuring user passwords...');
  const bcrypt = require('bcrypt');
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password_hash: adminHash }
  });

  const testUserHash = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({
    where: { username: '23-00201' },
    data: { password_hash: testUserHash }
  });

  // Ensure test alumni has pending status
  await prisma.alumniRecord.updateMany({
    where: { student_id: '23-00201' },
    data: { survey_status: 'pending' }
  });

  console.log('Comprehensive restoration complete.');
}

main()
  .catch((e) => {
    console.error('Restoration failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
