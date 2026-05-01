const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.surveyTemplate.findMany({
    include: {
      template_questions: {
        include: {
          question: {
            include: {
              options: true
            }
          }
        }
      }
    }
  });
  console.log('Templates found:', templates.length);
  templates.forEach(t => {
    console.log(`- [${t.id}] ${t.name} (Key: ${t.template_key}, Path: ${t.path_key}, Active: ${t.is_active})`);
    console.log(`  Questions: ${t.template_questions.length}`);
    t.template_questions.forEach(tq => {
      console.log(`    - ${tq.question.question_text} (${tq.question.question_type}, Key: ${tq.question.question_key})`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
