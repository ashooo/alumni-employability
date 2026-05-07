const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('../generated/client');

const prisma = new PrismaClient();

const DATASET_PATH = path.resolve(__dirname, '../../ml/data/employability/combined_employability.csv');

function parseBoardExam(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n)) return null;
  return n === 1 ? 1 : 0;
}

async function main() {
  const workbook = xlsx.readFile(DATASET_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const boardByStudentId = new Map();
  for (const row of rows) {
    const studentId = String(row['Student Number'] || '').trim();
    if (!studentId) continue;
    const boardExam = parseBoardExam(row['Board Exam']);
    if (boardExam === null) continue;
    boardByStudentId.set(studentId, boardExam);
  }

  const before = await prisma.academicSnapshot.aggregate({
    _count: { _all: true, board_exam: true },
  });

  const alumni = await prisma.alumniProfile.findMany({
    select: { id: true, student_id: true },
  });
  const profileByStudentId = new Map(alumni.map((a) => [a.student_id, a.id]));

  const updates = [];
  for (const [studentId, boardExam] of boardByStudentId.entries()) {
    const profileId = profileByStudentId.get(studentId);
    if (!profileId) continue;
    updates.push({ profileId, boardExam });
  }

  const BATCH_SIZE = 500;
  let updatedRows = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const tx = batch.map((u) =>
      prisma.academicSnapshot.updateMany({
        where: { alumni_profile_id: u.profileId },
        data: { board_exam: u.boardExam },
      })
    );
    const results = await prisma.$transaction(tx);
    for (const r of results) updatedRows += r.count;
    process.stdout.write(`Updated ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}\r`);
  }
  process.stdout.write('\n');

  const after = await prisma.academicSnapshot.aggregate({
    _count: { _all: true, board_exam: true },
  });

  console.log(JSON.stringify({
    dataset_rows: rows.length,
    unique_students_in_dataset: boardByStudentId.size,
    matched_students_in_db: updates.length,
    snapshot_rows_updated: updatedRows,
    before_board_exam_non_null: before._count.board_exam,
    after_board_exam_non_null: after._count.board_exam,
    snapshot_total: after._count._all,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

