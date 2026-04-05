# Alumni Insight Hub

A full-stack alumni tracking and survey platform for PLP (Pamantasan ng Lungsod ng Pasig).

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui  
**Backend:** Node.js, Express, MySQL  
**ML:** Python, scikit-learn / TensorFlow (planned)

## Project Structure

```
alumni-insight-hub/
├── client/       # React + Vite frontend
├── server/       # Express + MySQL backend
├── ml/           # Python models, training, cron jobs
└── package.json  # Root dev scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- MySQL

### Install dependencies
```bash
npm run install:all
```

### Run development servers
```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:5000

## User Roles

| Role | Access |
|------|--------|
| Superadmin | System settings, manage admins, audit logs |
| Admin | Users, surveys, programs, analytics, reports |
| Alumni | Dashboard, surveys, profile, results |

## Environment Variables

Copy and fill in:
```bash
cp server/.env.example server/.env
```
