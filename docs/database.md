# Database guide

Core relationships:
- User -> ShopMember -> Shop
- Shop -> Customer -> CreditAccount -> Installment
- CreditAccount -> Payment -> PaymentAllocation -> Installment

Money uses PostgreSQL Decimal(14,2), not JavaScript floating point as the persistent representation. The API starter converts values carefully for installment allocation; for production, use decimal arithmetic end-to-end.

Do not hard-delete payment or allocation history. Implement reversal/refund records and immutable audit events.
