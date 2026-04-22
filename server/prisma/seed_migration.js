require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('Starting data restoration...');

  // 1. Restore Colleges
  const collegesPath = path.join(__dirname, '..', 'old_colleges_fixed.txt');
  if (fs.existsSync(collegesPath)) {
    const lines = fs.readFileSync(collegesPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split('\t');
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const data = {};
      headers.forEach((h, idx) => {
        if (h === 'name' || h === 'description') {
          data[h] = values[idx] === 'NULL' ? null : values[idx];
        }
      });
      await prisma.college.create({
        data: {
          id: parseInt(values[0]),
          name: data.name,
          description: data.description
        }
      });
    }
    console.log('Colleges restored.');
  }

  // 2. Restore Degrees (Programs)
  const programsPath = path.join(__dirname, '..', 'old_programs_fixed.txt');
  if (fs.existsSync(programsPath)) {
    const lines = fs.readFileSync(programsPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split('\t');
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      await prisma.degree.create({
        data: {
          id: parseInt(values[0]),
          name: values[1],
          college_id: parseInt(values[3]),
          description: values[4] === 'NULL' ? null : values[4]
        }
      });
    }
    console.log('Degrees restored.');
  }

  // 3. Restore Users
  const usersPath = path.join(__dirname, '..', 'old_users_fixed.txt');
  if (fs.existsSync(usersPath)) {
    const lines = fs.readFileSync(usersPath, 'utf-8').trim().split('\n');
    const headers = lines[0].split('\t');
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      await prisma.user.create({
        data: {
          id: parseInt(values[0]),
          username: values[1],
          email: values[2] === 'NULL' ? null : values[2],
          password_hash: values[3],
          role: values[4],
          first_name: values[5],
          last_name: values[6],
          middle_name: values[7] === 'NULL' ? null : values[7],
          suffix: values[8] === 'NULL' ? null : values[8]
        }
      });
    }
    console.log('Users restored.');
  }

  // 4. Create Initial StudentAcademic entries for existing alumni
  const alumniPath = path.join(__dirname, '..', 'old_alumni_fixed.txt');
  if (fs.existsSync(alumniPath)) {
    const lines = fs.readFileSync(alumniPath, 'utf-8').trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        // id	student_id	first_name	last_name	middle_name	suffix	email	program	batch_year	status	survey_status	imported_by	imported_at	program_id
        const studentId = values[1];
        const programId = parseInt(values[13]);
        const gradYear = parseInt(values[8]);
        
        // Find user by username (studentId)
        const user = await prisma.user.findUnique({ where: { username: studentId } });
        if (user && !isNaN(programId)) {
            await prisma.studentAcademic.create({
                data: {
                    student_id: studentId,
                    user_id: user.id,
                    degree_id: programId,
                    year_graduated: isNaN(gradYear) ? 2024 : gradYear
                }
            });
        }
    }
    console.log('Initial StudentAcademic records created.');
  }

  console.log('Data restoration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
