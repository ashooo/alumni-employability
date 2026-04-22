const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    take: 5,
    select: { username: true, email: true }
  });
  
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    take: 2,
    select: { username: true, email: true }
  });

  console.log('--- Sample Students (Username is Student ID) ---');
  console.table(students);
  
  console.log('\n--- Sample Admins ---');
  console.table(admins);
}

main().catch(console.error).finally(() => prisma.$disconnect());
