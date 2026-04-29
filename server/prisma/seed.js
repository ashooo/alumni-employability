const { PrismaClient } = require('../generated/client');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

const COMPETENCY_FILE = path.resolve(
  __dirname,
  '../../ml/data/competency_compilation.csv'
);

const COLUMN_KIND_MAP = {
  KNOWLEDGE: 'KNOWLEDGE',
  ABILITIES: 'ABILITY',
  INTERESTS: 'INTEREST',
  'TECHNOLOGY-SKILLS': 'TECHNOLOGY'
};

const SOFT_SKILL_NAMES = new Set([
  'Active Learning', 'Active Listening', 'Complex Problem Solving', 'Coordination',
  'Critical Thinking', 'Instructing', 'Judgment and Decision Making', 'Learning Strategies',
  'Management of Financial Resources', 'Management of Material Resources',
  'Management of Personnel Resources', 'Monitoring', 'Negotiation', 'Persuasion',
  'Reading Comprehension', 'Service Orientation', 'Social Perceptiveness', 'Speaking',
  'Time Management', 'Writing'
]);

const HARD_SKILL_NAMES = new Set([
  'Equipment Maintenance', 'Equipment Selection', 'Installation', 'Mathematics',
  'Operation and Control', 'Operations Analysis', 'Operations Monitoring', 'Programming',
  'Quality Control Analysis', 'Repairing', 'Science', 'Systems Analysis', 'Systems Evaluation',
  'Technology Design', 'Troubleshooting'
]);

async function seedCompetencies() {
  console.log('Seeding competencies...');
  
  if (!fs.existsSync(COMPETENCY_FILE)) {
    console.warn(`Competency compilation file not found at ${COMPETENCY_FILE}. Skipping.`);
    return;
  }

  const workbook = xlsx.readFile(COMPETENCY_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const uniqueRecords = new Map();

  for (const row of rows) {
    // Process categorized columns
    for (const [columnName, kind] of Object.entries(COLUMN_KIND_MAP)) {
      const val = String(row[columnName] || '').trim();
      if (val && val.length <= 150) {
        const key = `${kind}:${val.toLowerCase()}`;
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, { name: val, kind, source: 'seed', is_active: true });
        }
      }
    }

    // Process Skills column
    const skillVal = String(row.SKILLS || '').trim();
    if (skillVal && skillVal.length <= 150) {
      let kind = null;
      if (SOFT_SKILL_NAMES.has(skillVal)) kind = 'SOFT_SKILL';
      else if (HARD_SKILL_NAMES.has(skillVal)) kind = 'HARD_SKILL';

      if (kind) {
        const key = `${kind}:${skillVal.toLowerCase()}`;
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, { name: skillVal, kind, source: 'seed', is_active: true });
        }
      }
    }
  }

  const records = Array.from(uniqueRecords.values());
  
  // Chunking for large inserts
  const CHUNK_SIZE = 100;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    await prisma.competency.createMany({
      data: chunk,
      skipDuplicates: true
    });
  }

  console.log(`Successfully seeded ${records.length} competencies.`);
}

async function main() {
  try {
    await seedCompetencies();
    // Add other seeding functions here as needed
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
