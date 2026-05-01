const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.surveyQuestion.findMany({
    include: {
      template_questions: {
        include: {
          template: true
        }
      }
    }
  });

  questions.forEach(q => {
    const templates = q.template_questions.map(tq => tq.template.name).join(', ');
    console.log(`Question: "${q.question_text}"`);
    console.log(`  Key: ${q.question_key}`);
    console.log(`  Templates: ${templates}`);
    console.log('---');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
