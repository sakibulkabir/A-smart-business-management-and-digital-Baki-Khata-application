# Setup guide

1. Install Node.js 20+ and Docker Desktop.
2. Copy backend and frontend `.env.example` files to `.env`.
3. Run `docker compose up -d` from project root.
4. In `backend`, run `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`, `npm run dev`.
5. In `frontend`, run `npm install`, `npm run dev`.

If PowerShell blocks npm scripts, use a normal PowerShell terminal with Node installed, or run commands from Windows Terminal. Do not change machine-wide execution policy just for this project.
