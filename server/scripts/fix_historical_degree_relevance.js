const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating historical records to include Degree Relevance...');
  
  const submissions = await prisma.surveySubmission.findMany({
    where: {
      template: {
        template_key: 'historical_import'
      }
    },
    select: { id: true }
  });

  const submissionIds = submissions.map(s => s.id);

  if (submissionIds.length > 0) {
    const result = await prisma.employmentOutcome.updateMany({
      where: {
        submission_id: { in: submissionIds },
        employment_status: { in: ['EMPLOYED', 'SELF_EMPLOYED', 'FREELANCER'] },
        degree_relevance: null
      },
      data: {
        degree_relevance: true
      }
    });
    
    console.log(`Updated ${result.count} historical employment outcomes with degree_relevance = true.`);
  } else {
    console.log('No historical submissions found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
