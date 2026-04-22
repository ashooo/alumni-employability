const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial configuration...');

  // 1. Seed Skills
  const softSkills = [
    'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 
    'Time Management', 'Adaptability', 'Critical Thinking', 'Work Ethic'
  ];
  const hardSkills = [
    'Programming', 'Data Analysis', 'Web Development', 'Digital Marketing', 
    'Networking', 'Cybersecurity', 'Cloud Computing', 'Database Management',
    'Financial Accounting', 'Project Management', 'Technical Writing', 'UI/UX Design'
  ];

  for (const s of softSkills) {
    await prisma.skill.upsert({
      where: { id: 0 }, // Just using name as identifier for seeding logic if needed, but Skill id is autoincrement
      // Actually, Skill doesn't have a unique name in schema yet, but I'll just create if not exists by name check
      create: { name: s, type: 'soft' },
      update: {}
    });
  }

  // Since name isn't unique in schema yet (I didn't add @unique to name), I'll check first
  for (const name of softSkills) {
    const existing = await prisma.skill.findFirst({ where: { name, type: 'soft' } });
    if (!existing) await prisma.skill.create({ data: { name, type: 'soft' } });
  }
  for (const name of hardSkills) {
    const existing = await prisma.skill.findFirst({ where: { name, type: 'hard' } });
    if (!existing) await prisma.skill.create({ data: { name, type: 'hard' } });
  }
  console.log('Skills seeded.');

  // 2. Create Initial Tracer Template
  const tracer = await prisma.surveyTemplate.upsert({
    where: { id: 1 },
    update: { is_active: true },
    create: {
      id: 1,
      name: 'Initial Alumni Tracer Survey',
      description: 'Comprehensive tracer study for employability prediction.',
      is_active: true
    }
  });
  console.log('Initial Tracer Template created.');

  // 3. Create Follow-up Template
  await prisma.surveyTemplate.upsert({
    where: { id: 2 },
    update: { is_active: true },
    create: {
      id: 2,
      name: 'Employment Follow-up Survey',
      description: 'Follow-up study to verify employment status after 3-6 months.',
      target_months: 6,
      is_active: true
    }
  });
  console.log('Follow-up Template created.');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
