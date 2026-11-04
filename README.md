# HisabBondhu

**Shohoj Hisab, Nirapod Bebsha.**

HisabBondhu is a business management application that helps shop owners manage customers, track baki (credit), organize installments, and record payments in one place.

## Features

- Customer Management
- Baki Khata Management
- Installment Tracking
- Payment Records
- Financial Dashboard
- JWT Authentication
- Responsive User Interface

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Infrastructure:** Docker Compose, Redis

## Requirements

- Node.js 20+
- npm 10+
- Docker Desktop

## Getting Started

```bash
git clone https://github.com/sakibulkabir/A-smart-business-management-and-digital-Baki-Khata-application.git
cd HisabBondhu
```

Configure environment files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Start database services:

```bash
docker compose up -d
```

Start the backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

## Local Development URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- API Health: http://localhost:4000/api/v1/health
- API Docs: http://localhost:4000/api/docs

## Security

Never commit `.env` files, database credentials, or secret keys to GitHub. External payment, SMS, OTP, and voice services require separate configuration.

## License

Personal development project.