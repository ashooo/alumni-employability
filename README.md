# Alumni Insight Hub

A full-stack alumni tracking and survey platform for PLP (Pamantasan ng Lungsod ng Pasig).

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, MySQL, Prisma
- ML: Python scripts for prediction and job matching (`ml/`)

## Project Structure

```text
alumni-employability/
|-- client/       # React + Vite frontend
|-- server/       # Express + Prisma + MySQL backend
|-- ml/           # Python models, training, and runtime scripts
`-- package.json  # Root dev scripts
```

## Installation Guide

### 1. Prerequisites

- Node.js 18+ and npm
- MySQL 8+
- Python 3.10+ (needed for ML scripts only)

### 2. Clone and enter the project

```bash
git clone <your-repo-url>
cd alumni-employability
```

### 3. Install Node dependencies

Install frontend and backend dependencies from the repo root:

```bash
npm run install:all
```

### 4. Configure environment variables

Create `server/.env` and add at least the required values below:

```env
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/alumni_tracer_refactor"
JWT_SECRET="replace-with-a-secure-random-string"
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASS="your-gmail-app-password"
```

Notes:

- `DATABASE_URL` is required by Prisma and backend DB services.
- Email variables are required for OTP/password reset flows.
- `server/.env.refactor.example` exists in this repo, but it uses `DATABASE_URL_REFACTOR`; the running server currently reads `DATABASE_URL`.

### 5. Set up Prisma and database schema

From the `server/` folder:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate:deploy
```

If you are doing local development and want Prisma to create/apply migrations interactively, you can use:

```bash
npm run prisma:migrate:dev
```

Optional seed command:

```bash
npm run prisma:seed
```

### 6. Run the app in development mode

From the repo root:

```bash
cd ..
npm run dev
```

Default local URLs:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5000](http://localhost:5000)

## ML Setup (Venv + Models)

### 1. Create and activate a Python virtual environment

From the repo root:

```bash
python -m venv .venv
```

Windows (PowerShell):

```bash
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install ML dependencies

```bash
pip install -U pip
pip install -U -r ml/requirements.txt
```

### 3. Download model artifacts

Download the model files from this Drive folder:

- [ML Model Artifacts](https://drive.google.com/drive/folders/1G9uYoR3lEuuvVWOJjFwNGvaCwAAkwOFy?usp=sharing)

Then place the downloaded artifacts into `ml/models/` (preserve filenames).

Expected files include:

- `ml/models/onet_embeddings.faiss`
- `ml/models/occupation_metadata.json`
- `ml/models/job_matcher_config.json`
- `ml/models/jobbert_v2_onnx/` (folder)

## User Roles

| Role | Access |
|------|--------|
| Superadmin | System settings, manage admins, audit logs |
| Admin | Users, surveys, programs, analytics, reports |
| Alumni | Dashboard, surveys, profile, results |
