const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { getRefactorPrisma, getRefactorSetupStatus } = require('../config/db');

const DEFAULT_INPUT_PATH = path.resolve(
  __dirname,
  '../../ml/data/competency_compilation.csv'
);
const MAX_NAME_LENGTH = 150;
const CHUNK_SIZE = 500;

const COLUMN_KIND_MAP = {
  KNOWLEDGE: 'KNOWLEDGE',
  ABILITIES: 'ABILITY',
  INTERESTS: 'INTEREST',
  'TECHNOLOGY-SKILLS': 'TECHNOLOGY'
};

const SOFT_SKILL_NAMES = new Set([
  'Active Learning',
  'Active Listening',
  'Complex Problem Solving',
  'Coordination',
  'Critical Thinking',
  'Instructing',
  'Judgment and Decision Making',
  'Learning Strategies',
  'Management of Financial Resources',
  'Management of Material Resources',
  'Management of Personnel Resources',
  'Monitoring',
  'Negotiation',
  'Persuasion',
  'Reading Comprehension',
  'Service Orientation',
  'Social Perceptiveness',
  'Speaking',
  'Time Management',
  'Writing'
]);

const HARD_SKILL_NAMES = new Set([
  'Equipment Maintenance',
  'Equipment Selection',
  'Installation',
  'Mathematics',
  'Operation and Control',
  'Operations Analysis',
  'Operations Monitoring',
  'Programming',
  'Quality Control Analysis',
  'Repairing',
  'Science',
  'Systems Analysis',
  'Systems Evaluation',
  'Technology Design',
  'Troubleshooting'
]);

const normalizeValue = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const chunkArray = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const parseArgs = (argv) => {
  let inputPath = DEFAULT_INPUT_PATH;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (argument === '--file') {
      inputPath = argv[index + 1]
        ? path.resolve(process.cwd(), argv[index + 1])
        : inputPath;
      index += 1;
    }
  }

  return { inputPath, dryRun };
};

const readCompilationRows = (inputPath) => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const workbook = xlsx.readFile(inputPath, {
    raw: false
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error(`No sheets found in input file: ${inputPath}`);
  }

  return xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: ''
  });
};

const resolveSkillKind = (skillName) => {
  if (SOFT_SKILL_NAMES.has(skillName)) {
    return 'SOFT_SKILL';
  }

  if (HARD_SKILL_NAMES.has(skillName)) {
    return 'HARD_SKILL';
  }

  return null;
};

const buildRecords = (rows) => {
  const uniqueRecords = new Map();
  const stats = {
    byKind: {
      SOFT_SKILL: 0,
      HARD_SKILL: 0,
      KNOWLEDGE: 0,
      ABILITY: 0,
      INTEREST: 0,
      TECHNOLOGY: 0
    },
    unmappedSkills: [],
    skippedTooLong: []
  };

  for (const row of rows) {
    for (const [columnName, rawKind] of Object.entries(COLUMN_KIND_MAP)) {
      const rawValue = normalizeValue(row[columnName]);
      if (!rawValue) {
        continue;
      }

      if (rawValue.length > MAX_NAME_LENGTH) {
        stats.skippedTooLong.push({
          name: rawValue,
          column: columnName
        });
        continue;
      }

      const uniqueKey = `${rawKind}:${rawValue.toLowerCase()}`;
      if (!uniqueRecords.has(uniqueKey)) {
        uniqueRecords.set(uniqueKey, {
          name: rawValue,
          kind: rawKind,
          source: 'ml.competency_compilation.csv',
          category: columnName,
          is_active: true
        });
        stats.byKind[rawKind] += 1;
      }
    }

    const skillValue = normalizeValue(row.SKILLS);
    if (!skillValue) {
      continue;
    }

    const skillKind = resolveSkillKind(skillValue);
    if (!skillKind) {
      stats.unmappedSkills.push(skillValue);
      continue;
    }

    if (skillValue.length > MAX_NAME_LENGTH) {
      stats.skippedTooLong.push({
        name: skillValue,
        column: 'SKILLS'
      });
      continue;
    }

    const uniqueKey = `${skillKind}:${skillValue.toLowerCase()}`;
    if (!uniqueRecords.has(uniqueKey)) {
      uniqueRecords.set(uniqueKey, {
        name: skillValue,
        kind: skillKind,
        source: 'ml.competency_compilation.csv',
        category: 'SKILLS',
        is_active: true
      });
      stats.byKind[skillKind] += 1;
    }
  }

  return {
    records: Array.from(uniqueRecords.values()),
    stats
  };
};

const groupRecordsByKind = (records) => {
  return records.reduce((grouped, record) => {
    if (!grouped[record.kind]) {
      grouped[record.kind] = [];
    }

    grouped[record.kind].push(record);
    return grouped;
  }, {});
};

async function main() {
  const { inputPath, dryRun } = parseArgs(process.argv.slice(2));
  const setupStatus = getRefactorSetupStatus();

  if (!setupStatus.ready) {
    throw new Error(setupStatus.message);
  }

  const rows = readCompilationRows(inputPath);
  const { records, stats } = buildRecords(rows);
  const groupedRecords = groupRecordsByKind(records);

  console.log(
    JSON.stringify(
      {
        input_file: inputPath,
        dry_run: dryRun,
        parsed_rows: rows.length,
        unique_records: records.length,
        by_kind: stats.byKind,
        skipped_too_long: stats.skippedTooLong.length,
        unmapped_skills: stats.unmappedSkills
      },
      null,
      2
    )
  );

  if (stats.unmappedSkills.length > 0) {
    throw new Error(
      `Unmapped skills found in compilation file: ${stats.unmappedSkills.join(', ')}`
    );
  }

  if (dryRun) {
    return;
  }

  const prisma = getRefactorPrisma();
  const results = {};

  for (const [kind, kindRecords] of Object.entries(groupedRecords)) {
    let inserted = 0;

    for (const chunk of chunkArray(kindRecords, CHUNK_SIZE)) {
      const result = await prisma.competency.createMany({
        data: chunk,
        skipDuplicates: true
      });
      inserted += result.count;
    }

    results[kind] = {
      total: kindRecords.length,
      inserted,
      skipped_existing: kindRecords.length - inserted
    };
  }

  console.log(JSON.stringify({ seeded: results }, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
