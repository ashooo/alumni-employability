const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Employability Data Wizard...');

    // 1. Survey Templates
    console.log('  Seeding Survey Templates...');
    const tracerTemplate = await prisma.surveyTemplate.upsert({
        where: { id: 1 },
        update: { name: 'Initial Alumni Tracer', type: 'initial' },
        create: { id: 1, name: 'Initial Alumni Tracer', type: 'initial', description: 'Mandatory survey for graduating alumni' }
    });

    await prisma.surveyTemplate.upsert({
        where: { id: 2 },
        update: { name: 'Employment Follow-up', type: 'followup' },
        create: { id: 2, name: 'Employment Follow-up', type: 'followup', description: '2-month follow-up for ground truth collection' }
    });

    // 2. Skills
    console.log('  Seeding Cleaned Skills...');
    const hardSkills = [
        'Auditing', 'Budgeting & Analysis', 'Cloud Computing', 'Data Structures & Algorithms',
        'Database Management', 'Financial Accounting', 'Financial Management', 'Java Programming',
        'Machine Learning', 'Networking', 'Programming Logic', 'Python Programming',
        'Software Engineering', 'System Design', 'Taxation', 'Web Development',
        'Statistical Analysis', 'Artificial Intelligence', 'Cybersecurity', 'Circuit Design',
        'Communication Systems', 'Clinical Skills', 'Patient Care', 'Health Assessment',
        'Emergency Response'
    ];

    const softSkills = [
        'Classroom Management', 'Curriculum Development', 'Educational Technology',
        'Leadership & Decision-Making', 'Marketing', 'Strategic Planning', 'Teaching',
        'English Communication & Writing', 'Filipino Communication & Writing',
        'Early Childhood Education', 'Customer Service', 'Event Management',
        'Food & Beverage Management', 'Risk Management', 'Innovation & Business Planning',
        'Consumer Behavior Analysis', 'Sales Management', 'Problem-Solving'
    ];

    for (const name of hardSkills) {
        await prisma.skill.upsert({
            where: { id: hardSkills.indexOf(name) + 1 }, // ID mapping
            update: { name, type: 'hard' },
            create: { name, type: 'hard' }
        });
    }

    const softStartId = hardSkills.length + 1;
    for (const name of softSkills) {
        await prisma.skill.upsert({
            where: { id: softStartId + softSkills.indexOf(name) },
            update: { name, type: 'soft' },
            create: { name, type: 'soft' }
        });
    }

    // 3. Survey Questions (Tracer Survey)
    console.log('  Seeding Tracer Questions...');
    
    // Ensure Categories
    const categories = [
        { id: 1, name: 'Personal Information', order_index: 1 },
        { id: 2, name: 'Employment Details', order_index: 2 },
        { id: 3, name: 'Educational Assessment', order_index: 3 }
    ];
    for (const c of categories) {
        await prisma.surveyCategory.upsert({ where: { id: c.id }, update: c, create: c });
    }

    const questions = [
        // Section 1
        { id: 1, category_id: 1, text: 'Current Permanent Address', type: 'text', order_index: 1, version: 1 },
        { id: 2, category_id: 1, text: 'Mobile Number', type: 'text', order_index: 2, version: 1 },
        // Section 2
        { id: 3, category_id: 2, text: 'Current Employment Status', type: 'select', 
          options: ['Employed', 'Unemployed', 'Self-Employed', 'Freelancer'], order_index: 1, version: 1 },
        { id: 4, category_id: 2, text: 'Job Title', type: 'text', order_index: 2, version: 1 },
        // Section 3
        { id: 5, category_id: 3, text: 'Relevance of Degree to Job', type: 'scale', 
          scale_min: 1, scale_max: 5, order_index: 1, version: 1 }
    ];

    for (const q of questions) {
        // Fix JSON options for Prisma
        const data = { ...q };
        if (data.options) {
            // Prisma Json field accepts JS objects directly
        }
        await prisma.surveyQuestion.upsert({
            where: { id: q.id },
            update: data,
            create: data
        });
    }

    // 4. System Settings
    console.log('  Seeding System Settings...');
    const settings = [
        { key: 'system_name', value: 'Alumni Insight Hub' },
        { key: 'allow_registration', value: '1' }
    ];
    for (const s of settings) {
        await prisma.systemSetting.upsert({ where: { key: s.key }, update: s, create: s });
    }

    console.log('Seeding Wizard Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
