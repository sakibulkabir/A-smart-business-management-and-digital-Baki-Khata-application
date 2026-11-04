# Deployment checklist

- Provision managed PostgreSQL and Redis.
- Set strong production secrets through hosting provider environment settings.
- Set `NODE_ENV=production`, correct `DATABASE_URL`, `JWT_ACCESS_SECRET`, `FRONTEND_URL`.
- Deploy backend and frontend separately.
- Run Prisma migrations as a controlled release step.
- Configure HTTPS, CORS allowlist, rate limits and log retention.
- Configure database backups and test restores.
- Add Sentry/monitoring and uptime checks.
- Complete payment provider merchant onboarding and webhook signature verification before taking digital payments.
- Complete SMS/voice provider approval, sender ID registration and consent handling.
