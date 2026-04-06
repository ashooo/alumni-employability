export interface User {
  id: string;
  name: string;
  role: 'admin' | 'alumni';
  email?: string;
  program?: string;
  batchYear?: number;
  avatar?: string;
  firstLogin?: boolean;
  surveyCompleted?: boolean;
}

export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: 'admin123',
    user: {
      id: 'admin',
      name: 'Dr. Maria Santos',
      role: 'admin',
      email: 'admin@university.edu',
      firstLogin: false,
    },
  },
  '23-00240': {
    password: '0000',
    user: {
      id: '23-00240',
      name: 'Juan Dela Cruz',
      role: 'alumni',
      email: 'juan@email.com',
      program: 'BS Computer Science',
      batchYear: 2023,
      firstLogin: true,
      surveyCompleted: false,
    },
  },
};

export const programs = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Business Administration',
  'BS Accountancy',
  'BS Civil Engineering',
  'BS Mechanical Engineering',
  'BS Nursing',
  'BS Education',
];

export const batchYears = [2019, 2020, 2021, 2022, 2023, 2024];

export const employmentStatuses = ['Employed', 'Unemployed', 'Self-Employed', 'Freelancer', 'Further Studies'];

export const alumniPerProgram = [
  { program: 'BS CS', count: 245, employed: 210, rate: 85.7 },
  { program: 'BS IT', count: 198, employed: 162, rate: 81.8 },
  { program: 'BSBA', count: 320, employed: 256, rate: 80.0 },
  { program: 'BSA', count: 150, employed: 135, rate: 90.0 },
  { program: 'BSCE', count: 180, employed: 153, rate: 85.0 },
  { program: 'BSME', count: 120, employed: 96, rate: 80.0 },
  { program: 'BSN', count: 280, employed: 252, rate: 90.0 },
  { program: 'BSEd', count: 210, employed: 168, rate: 80.0 },
];

export const yearlyEmployment = [
  { year: '2019', rate: 72, male: 70, female: 74 },
  { year: '2020', rate: 65, male: 63, female: 67 },
  { year: '2021', rate: 71, male: 69, female: 73 },
  { year: '2022', rate: 78, male: 76, female: 80 },
  { year: '2023', rate: 82, male: 80, female: 84 },
  { year: '2024', rate: 85, male: 83, female: 87 },
];

export const predictionData = {
  arima: {
    historical: [
      { year: '2019', value: 72 },
      { year: '2020', value: 65 },
      { year: '2021', value: 71 },
      { year: '2022', value: 78 },
      { year: '2023', value: 82 },
      { year: '2024', value: 85 },
    ],
    forecast: [
      { year: '2025', value: 87, lower: 83, upper: 91 },
      { year: '2026', value: 89, lower: 84, upper: 94 },
      { year: '2027', value: 90, lower: 84, upper: 96 },
    ],
    metrics: { mae: 2.3, rmse: 3.1, mape: 3.2, r2: 0.91 },
  },
  linear: {
    historical: [
      { year: '2019', value: 72 },
      { year: '2020', value: 65 },
      { year: '2021', value: 71 },
      { year: '2022', value: 78 },
      { year: '2023', value: 82 },
      { year: '2024', value: 85 },
    ],
    forecast: [
      { year: '2025', value: 86, lower: 82, upper: 90 },
      { year: '2026', value: 89, lower: 84, upper: 94 },
      { year: '2027', value: 92, lower: 86, upper: 98 },
    ],
    metrics: { mae: 2.8, rmse: 3.5, mape: 3.8, r2: 0.88 },
  },
  randomForest: {
    historical: [
      { year: '2019', value: 72 },
      { year: '2020', value: 65 },
      { year: '2021', value: 71 },
      { year: '2022', value: 78 },
      { year: '2023', value: 82 },
      { year: '2024', value: 85 },
    ],
    forecast: [
      { year: '2025', value: 88, lower: 85, upper: 91 },
      { year: '2026', value: 90, lower: 86, upper: 94 },
      { year: '2027', value: 91, lower: 86, upper: 96 },
    ],
    metrics: { mae: 1.9, rmse: 2.6, mape: 2.5, r2: 0.94 },
    featureImportance: [
      { feature: 'Program', importance: 0.28 },
      { feature: 'Skills Match', importance: 0.22 },
      { feature: 'GPA', importance: 0.18 },
      { feature: 'Gender', importance: 0.12 },
      { feature: 'Internship', importance: 0.11 },
      { feature: 'Personality', importance: 0.09 },
    ],
  },
};

export const skillsData = [
  { skill: 'Communication', value: 85 },
  { skill: 'Problem Solving', value: 78 },
  { skill: 'Technical', value: 82 },
  { skill: 'Leadership', value: 65 },
  { skill: 'Teamwork', value: 90 },
  { skill: 'Adaptability', value: 72 },
];

export const jobRecommendations = [
  { title: 'Software Developer', match: 92, skills: ['Programming', 'Problem Solving', 'Technical'], industry: 'Technology' },
  { title: 'Data Analyst', match: 87, skills: ['Analytics', 'Statistics', 'Communication'], industry: 'Technology' },
  { title: 'Systems Administrator', match: 81, skills: ['Networking', 'Technical', 'Problem Solving'], industry: 'IT Services' },
  { title: 'Project Manager', match: 75, skills: ['Leadership', 'Communication', 'Planning'], industry: 'Various' },
  { title: 'UX Designer', match: 70, skills: ['Design', 'Research', 'Communication'], industry: 'Technology' },
];

export const surveyQuestions = [
  {
    id: 'cat-1',
    category: 'General Employment',
    questions: [
      { id: 'q1', text: 'What is your current employment status?', type: 'select' as const, required: true, options: employmentStatuses, version: 1 },
      { id: 'q2', text: 'How long did it take you to find your first job after graduation?', type: 'select' as const, required: true, options: ['Less than 1 month', '1-3 months', '3-6 months', '6-12 months', 'More than 1 year', 'Not yet employed'], version: 1 },
      { id: 'q3', text: 'What is your current monthly salary range?', type: 'select' as const, required: false, options: ['Below 15,000', '15,000-25,000', '25,000-40,000', '40,000-60,000', 'Above 60,000'], version: 1 },
    ],
  },
  {
    id: 'cat-2',
    category: 'Personal Information',
    questions: [
      { id: 'q4', text: 'What is your age?', type: 'number' as const, required: true, version: 1 },
      { id: 'q5', text: 'What is your gender?', type: 'select' as const, required: true, options: ['Male', 'Female', 'Prefer not to say'], version: 1 },
    ],
  },
  {
    id: 'cat-3',
    category: 'Skills Assessment',
    questions: [
      { id: 'q6', text: 'Rate your communication skills', type: 'scale' as const, required: true, version: 1 },
      { id: 'q7', text: 'Rate your technical/professional skills', type: 'scale' as const, required: true, version: 1 },
      { id: 'q8', text: 'Rate your problem-solving skills', type: 'scale' as const, required: true, version: 1 },
      { id: 'q9', text: 'Rate your leadership skills', type: 'scale' as const, required: true, version: 1 },
    ],
  },
  {
    id: 'cat-4',
    category: 'Personality Type',
    questions: [
      { id: 'q10', text: 'Which best describes your work personality?', type: 'select' as const, required: true, options: ['Analytical', 'Creative', 'Driver', 'Amiable'], version: 1 },
    ],
  },
  {
    id: 'cat-5',
    category: 'Degree Relevance',
    questions: [
      { id: 'q11', text: 'How relevant is your degree to your current job?', type: 'scale' as const, required: true, version: 1 },
      { id: 'q12', text: 'What industry are you currently working in?', type: 'text' as const, required: false, version: 1 },
    ],
  },
];

export const submissionHistory = [
  { id: 'sub-1', date: '2024-03-15', version: 'v1.0', status: 'Completed', questionsAnswered: 12 },
  { id: 'sub-2', date: '2024-09-20', version: 'v1.1', status: 'Completed', questionsAnswered: 14 },
];

export const alumniRecords = [
  { id: '23-00240', name: 'Juan Dela Cruz', program: 'BS Computer Science', batch: 2023, status: 'Active', email: 'juan@email.com', surveyStatus: 'Completed' },
  { id: '23-00241', name: 'Maria Garcia', program: 'BS Information Technology', batch: 2023, status: 'Active', email: 'maria@email.com', surveyStatus: 'Pending' },
  { id: '22-00100', name: 'Pedro Reyes', program: 'BS Business Administration', batch: 2022, status: 'Active', email: 'pedro@email.com', surveyStatus: 'Completed' },
  { id: '22-00101', name: 'Ana Lopez', program: 'BS Accountancy', batch: 2022, status: 'Inactive', email: 'ana@email.com', surveyStatus: 'Not Started' },
  { id: '21-00050', name: 'Carlos Santos', program: 'BS Civil Engineering', batch: 2021, status: 'Active', email: 'carlos@email.com', surveyStatus: 'Completed' },
  { id: '21-00051', name: 'Lisa Tan', program: 'BS Nursing', batch: 2021, status: 'Active', email: 'lisa@email.com', surveyStatus: 'Completed' },
  { id: '20-00030', name: 'Mark Rivera', program: 'BS Education', batch: 2020, status: 'Active', email: 'mark@email.com', surveyStatus: 'Pending' },
  { id: '20-00031', name: 'Sarah Cruz', program: 'BS Mechanical Engineering', batch: 2020, status: 'Active', email: 'sarah@email.com', surveyStatus: 'Completed' },
];

export const notifications = [
  { id: 'n1', title: 'Survey Updated', message: 'The tracer survey has been updated with new questions. Please complete the new questions.', date: '2024-12-01', read: false, type: 'warning' as const },
  { id: 'n2', title: 'Results Available', message: 'Your latest survey results and job recommendations are now available.', date: '2024-11-15', read: true, type: 'info' as const },
  { id: 'n3', title: 'Welcome', message: 'Welcome to the Alumni Tracer System!', date: '2024-10-01', read: true, type: 'info' as const },
];
