const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding repaired survey data...');

    // 1. System Settings
    const settings = [
        { key: 'system_name', value: 'Alumni Tracer System' },
        { key: 'system_email', value: 'alumni@plpasig.edu.ph' },
        { key: 'survey_deadline', value: '2026-12-31' },
        { key: 'allow_registration', value: '1' },
        { key: 'theme_color', value: '#3b82f6' }
    ];

    for (const s of settings) {
        await prisma.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value }
        });
    }

    // 2. Survey Categories
    const categories = [
        { id: 1, name: 'Personal Information', order_index: 1, description: 'Basic contact and personal details' },
        { id: 2, name: 'Employment Details', order_index: 2, description: 'Current employment status and history' },
        { id: 3, name: 'Educational Assessment', order_index: 3, description: 'Feedback on the academic program' }
    ];

    for (const c of categories) {
        await prisma.surveyCategory.upsert({
            where: { id: c.id },
            update: { name: c.name, order_index: c.order_index },
            create: c
        });
    }

    // 3. Survey Questions (Tracer Survey - Version 1)
    const questions = [
        // Section 1: Personal Information
        {
            id: 4,
            category_id: 1,
            text: 'What is your current permanent address?',
            type: 'text',
            order_index: 1,
            version: 1,
            required: 1
        },
        {
            id: 5,
            category_id: 1,
            text: 'What is your current mobile number?',
            type: 'number',
            order_index: 2,
            version: 1,
            required: 1
        },
        // Section 2: Employment Details
        {
            id: 1,
            category_id: 2,
            text: 'Are you currently employed?',
            type: 'select',
            options: ['Employed', 'Unemployed', 'Self-Employed', 'Freelancer'], // NO JSON.stringify
            order_index: 1,
            version: 1,
            required: 1
        },
        {
            id: 2,
            category_id: 2,
            text: 'What is your current job title?',
            type: 'text',
            order_index: 2,
            version: 1,
            required: 0
        },
        // Section 3: Educational Assessment
        {
            id: 3,
            category_id: 3,
            text: 'How relevant is your degree to your current profession?',
            type: 'scale',
            scale_min: 1,
            scale_max: 5,
            order_index: 3,
            version: 1,
            required: 1
        }
    ];

    for (const q of questions) {
        await prisma.surveyQuestion.upsert({
            where: { id: q.id },
            update: q,
            create: q
        });
    }

    // 4. Ensure Survey Version 1 is published
    await prisma.surveyVersion.upsert({
        where: { version_number: 1 },
        update: { published: 1, published_at: new Date() },
        create: { version_number: 1, published: 1, published_at: new Date() }
    });

    console.log('Seeding repaired complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
