# Architecture

HisabBondhu is a modular monolith:
- React PWA client
- Express REST API
- PostgreSQL relational database
- Prisma ORM
- Redis reserved for scheduled jobs and queues

Modules are separated by business domain. Keep payment, reminder, identity and tenant authorization boundaries explicit.

## Tenant isolation
Every shop-owned resource must be accessed through a shop membership check. Never trust a shop ID supplied by the browser without checking membership on the server.

## Production hardening still required
- Refresh-token rotation and secure HttpOnly cookie strategy
- OTP provider integration and account recovery
- CSRF strategy if cookie auth is adopted
- Redis/BullMQ worker process and reminder scheduler
- Provider-specific payment checkout and signed webhook handlers
- SMS/voice provider adapters and delivery logs
- Audit logging for all financial mutations
- Backup/restore drills, monitoring and alerting
