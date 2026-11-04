# REST API

Base URL: `/api/v1`

## Public
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

## Authenticated
- `GET /auth/me`
- `POST /shops`
- `GET /shops`
- `GET /customers/:shopId`
- `POST /customers/:shopId`
- `POST /credits/:shopId`
- `GET /credits/:shopId`
- `POST /payments/cash`
- `GET /payments/credit/:creditId`
- `GET /reports/:shopId/summary`

Use `Authorization: Bearer <accessToken>`.

All write endpoints validate input. Shop-scoped endpoints must verify membership. Digital payment endpoints are intentionally not faked; implement provider checkout and signature-verified webhook routes after merchant onboarding.
