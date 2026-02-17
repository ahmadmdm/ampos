# POS1 Monorepo (Arabic-first POS)

## Apps
- `apps/api`: Next.js API + Prisma + payment adapters + sync + waiter calls + KDS endpoints
- `apps/admin-web`: Admin dashboard (RTL)
- `apps/customer-web`: QR ordering UI + Call Waiter action
- `apps/kds-web`: Kitchen Display board
- `apps/waiter-web`: Waiter/Runner call workflow
- `apps/android-pos`: Android POS skeleton (Compose + Room + WorkManager sync)

## Packages
- `packages/types`: shared types
- `packages/sdk`: shared API client
- `packages/utils`: shared utility helpers
- `packages/ui`: shared design tokens

## Quick Start
1. Start infra:
   - `docker compose up -d`
2. Install deps:
   - `npm install`
3. Configure API env:
   - copy `apps/api/.env.example` to `apps/api/.env`
4. Prisma:
   - `npm run db:generate`
   - `npm run db:migrate`
5. Run services (separate terminals):
   - `npm run dev:api`
   - `npm --workspace @pos1/api run dev:socket`
   - `npm --workspace @pos1/api run dev:webhook-worker`
   - `npm run dev:admin`
   - `npm run dev:customer`
   - `npm run dev:kds`
   - `npm run dev:waiter`
6. Seed demo data (optional but recommended):
   - `npm --workspace @pos1/api run seed:demo`

## Core Implemented Features
- Multi-tenant models in Prisma (`Organization -> Branch -> Device/User/...`)
- RBAC and branch-scope guards (API-level)
- Customer menu + checkout session + request bill + waiter call endpoints (with rate limit)
- Waiter lifecycle endpoints (`CREATED -> ACKNOWLEDGED -> RESOLVED`)
- POS device register + snapshot + sync endpoint with idempotent dedup semantics by device/seq
- Payment provider adapter layer (`Moyasar` and `Tap`) + webhook signature checks
- JWT auth endpoints (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`)
- Refresh token rotation + revocation + logout endpoint
- Atomic payment confirmation flow that can create order + kitchen ticket
- KDS ticket query/status updates + realtime event emission hooks
- Admin APIs for branch settings, inventory movements, products, and user role assignment
- Table-bound signed QR token verification on customer menu/waiter/bill endpoints
- Metrics endpoint: `/api/metrics/summary`
- Arabic-first RTL UIs for Admin/Customer/KDS/Waiter
- Android POS local event log and periodic sync worker

## Notes
- Realtime now uses Redis pub/sub channel `rt:events` and Socket.IO rooms (`branch`, `kds`, `waiter`, `order`).
- Android project is a functional skeleton intended to be expanded with terminal SDK integration and printer adapters.
- For mutating API calls in web session mode, call `GET /api/auth/csrf` first and pass `x-csrf-token` header from the returned token/cookie.

### Auth Endpoints
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me
- POST /api/auth/logout
- GET /api/auth/csrf

### Customer Token Helpers
- POST /api/customer/table-token (dev helper to generate signed table token)

### POS Device Security
- POST /api/pos/devices/rotate-token

### Sensitive Order Ops (Audited)
- PATCH /api/orders/:orderId/discount
- PATCH /api/orders/:orderId/void
- PATCH /api/orders/:orderId/refund
- PATCH /api/orders/:orderId/transfer-table
- POST /api/orders/:orderId/split
- POST /api/orders/:orderId/merge

### Inventory/Waiter Ops
- GET /api/admin/branches/:branchId/inventory/low-stock
- GET /api/waiter/ready-queue
- POST /api/pos/print/receipt

### Catalog/Pricing/KDS Ops
- GET/POST /api/admin/branches/:branchId/categories
- GET/POST /api/admin/branches/:branchId/modifier-groups
- GET/POST /api/admin/branches/:branchId/pricing-rules
- PATCH /api/kds/ticket-items/:ticketItemId/status

### API Tests
- `npm --workspace @pos1/api run test`

### Realtime / Workers
- Start Socket server: `npm --workspace @pos1/api run dev:socket`
- Start webhook worker: `npm --workspace @pos1/api run dev:webhook-worker`
- Web apps socket URL (optional): `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:4001`)
