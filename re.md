
# Production Specification: Arabic-First POS Platform (Restaurant/Cafe + Retail)

## 0) Executive Summary
- Product: Multi-tenant POS platform for restaurants/cafes and light retail.
- Primary channels:
  - Android POS (cashier, offline-first)
  - Admin Web
  - Customer QR Ordering Web
  - KDS Web
  - Optional Waiter/Runner Web
- Stack:
  - Backend/API: Next.js (App Router Route Handlers) + TypeScript
  - DB: PostgreSQL + Prisma
  - Realtime: Socket.IO
  - Jobs: BullMQ + Redis
  - Web UIs: Next.js + Tailwind + shadcn/ui
  - Android: Kotlin + Jetpack Compose + Room + WorkManager
- Key principle: Arabic-first RTL UX with optional English.

---

## A) Product Spec + User Flows

### A1. Cashier POS Checkout Flow (Quick Sale + Table Service)
#### Quick Sale (Takeaway/Pickup)
1. Cashier opens `الرئيسية` and searches/selects products.
2. Modifiers/variants applied in item sheet.
3. Cart shows tax/service/discount.
4. Cashier selects payment method:
   - Cash
   - Card via external NFC terminal (Intent/SDK)
5. Order is submitted locally immediately (offline-safe), receipt printed.
6. Sync engine pushes event to backend; backend creates authoritative order.
7. If kitchen-required items exist, kitchen tickets are emitted to KDS.

#### Table Service (Dine-in)
1. Cashier/Waiter selects area/table from `الطاولات`.
2. Adds items to active table order.
3. Supports split/merge/transfer table.
4. Sends order to kitchen; KDS receives by station.
5. On payment, bill closes and table state becomes `AVAILABLE`.

#### Acceptance Criteria
- Checkout (online) in <= 2 taps after cart review.
- Checkout (offline) still produces local receipt + durable local event.
- Duplicate event from same device/seq never creates duplicate order.
- Table transfer/split/merge writes audit log entries.

### A2. Kitchen Flow (New -> Cooking -> Ready -> Served)
1. KDS receives `KITCHEN_TICKET_CREATED` in real-time.
2. Kitchen staff moves ticket item/status:
   - `NEW` -> `COOKING` -> `READY`
3. Runner/Waiter marks served (`SERVED`).
4. SLA timer highlights tickets > 12 minutes.
5. Status updates broadcast to POS + customer tracking timeline.

#### Acceptance Criteria
- New ticket appears in <= 1s median from order confirmation.
- Station filter shows only mapped items (Drinks/Grill/Dessert).
- Status change is persisted and visible across clients in real-time.

### A3. Customer QR Order + Payment + Tracking
1. Customer scans QR (`branchId`, `tableId`, signed token).
2. Opens menu, applies modifiers, adds to cart.
3. Chooses payment gateway (`Moyasar`/`Tap`) based on branch config.
4. On `Pay Now`, backend creates payment session.
5. Webhook confirms payment (server-authoritative), then order is created atomically.
6. Customer sees real-time timeline: `Received`, `Preparing`, `Ready`, `Served`.

#### Acceptance Criteria
- Payment success page does not create order until verified webhook.
- If webhook delayed, UI shows `قيد تأكيد الدفع` with polling/socket fallback.
- Customer can still call waiter from tracking page.

### A4. Call Waiter Flow
1. Persistent button `نداء النادل` visible on menu/cart/tracking pages.
2. Modal reasons:
   - `مساعدة`
   - `ماء`
   - `الحساب`
   - `أخرى`
   - optional note
3. API validates signed table binding + rate limit (1 call / 60s per table).
4. Waiter screen receives `WAITER_CALL_CREATED`.
5. Staff updates state: `ACKNOWLEDGED`, then `RESOLVED`.

#### Acceptance Criteria
- Second call within rate window returns friendly throttled message.
- Acknowledged/Resolved actor and timestamps are stored.
- Call lifecycle is visible in waiter dashboard and audit context.

### A5. Admin Setup Flow
1. Owner creates organization + branch.
2. Configures catalog (categories/products/variants/modifiers).
3. Sets pricing rules per branch.
4. Configures payments (Moyasar/Tap keys, webhook secrets).
5. Configures QR ordering + waiter call toggles + service charge + tax.
6. Creates users and role assignments.
7. Optionally loads inventory opening balances.

#### Acceptance Criteria
- Branch-specific settings do not leak across branches.
- Role permissions are enforced on UI and API.
- Sensitive config changes are audit-logged.

---

## B) Premium UI/UX Design Spec (Figma-like Text)

### B1. Design System / Tokens
#### Color Tokens
- Brand:
  - `--brand-600: #0E7490`
  - `--brand-500: #0891B2`
  - `--brand-100: #CFFAFE`
- Neutral:
  - `--bg: #F8FAFC`
  - `--surface: #FFFFFF`
  - `--text: #0F172A`
  - `--muted: #64748B`
  - `--border: #E2E8F0`
- Semantic:
  - Success `#16A34A`
  - Warning `#D97706`
  - Danger `#DC2626`
  - Info `#2563EB`
- Dark mode equivalents with AA contrast preserved.

#### Typography
- Arabic primary: `Tajawal` (UI), fallback `Noto Sans Arabic`.
- English numeric/technical: `Inter` fallback.
- Scale:
  - Display 36/44
  - H1 30/38
  - H2 24/32
  - H3 20/28
  - Body 16/24
  - Small 14/20
  - Caption 12/16

#### Spacing, Radius, Shadow
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40.
- Radius: 8 (inputs), 12 (cards), 16 (modals), 24 (chips).
- Shadows:
  - sm: subtle card
  - md: dropdown
  - lg: modal/floating action

#### Component Inventory + States
- Buttons: `Primary`, `Secondary`, `Ghost`, `Danger`.
- Inputs: text, search, numeric keypad, select, segmented control.
- Cards: product card, ticket card, table card, metric card.
- Feedback: toast, alert banner, skeleton, empty state.
- States per component: default, hover, pressed, focused, disabled, loading, error, empty.

#### RTL Rules
- Right alignment by default for Arabic labels.
- Chevron/icons mirrored where directional (`next`, `back`, `transfer`).
- Mixed strings keep LTR islands with `dir="ltr"` for codes/phones/IDs.
- Numerals: configurable (`Arabic-Indic` optional, default Western digits for POS speed).
- Currency format per locale: `ر.س` for SAR.
### B2. Screen Specs

#### Android POS (Cashier)
- Home:
  - Top: branch selector, shift status, search bar `ابحث عن منتج`.
  - Body: category tabs + product grid (large touch targets).
  - Right pane: cart with sticky totals.
- Cart Pane:
  - Item rows with qty steppers, modifiers summary, note.
  - Totals area: subtotal/tax/service/discount/grand total.
- Payment Modal:
  - Methods: `نقدي`, `بطاقة`, `NFC`.
  - Cash input quick chips (10/20/50/100).
  - Confirm + print options.
- Hold/Recall:
  - List of suspended orders with timestamp/cashier.
- Tables:
  - Area filter + table status colors.
  - Transfer/split/merge actions with confirmation modal.

#### Admin Web
- Dashboard:
  - KPI cards: sales today, orders count, avg ticket, payment success rate.
  - Trend chart by hour.
- Catalog:
  - Category tree, product table, modifier groups panel.
- Pricing:
  - Branch-specific price matrix + schedule rules.
- Inventory:
  - SKU list, stock levels, movement ledger, low stock alerts.
- Users/Roles:
  - Role templates + permission matrix.
- Branch Settings:
  - Tax/service toggles, payment provider keys, QR waiter call config.

#### Customer Web (QR)
- Menu Home:
  - Hero with table label `طاولة 12`.
  - Category chips + sticky search.
  - Product cards with quick add.
- Item Bottom Sheet:
  - Variant selector, modifier groups, note, qty, CTA `أضف للسلة`.
- Cart:
  - Editable items + price breakdown.
- Payment:
  - Provider selector if both enabled.
  - Terms + pay CTA `ادفع الآن`.
- Tracking:
  - Timeline + order summary.
  - Sticky buttons: `نداء النادل`, `طلب الحساب` (optional).

#### KDS Web
- Kanban columns: `جديد`, `قيد التحضير`, `جاهز`, `تم التقديم`.
- Ticket card:
  - Order code, table/type, elapsed timer, items, notes, allergens marker.
- Station filters:
  - Drinks / Grill / Dessert / All.
- Bulk actions optional for peak hours.

#### Waiter/Runner Web
- Calls Inbox:
  - Rows: table, reason, note, waiting time, status badge.
- Actions:
  - `استلام` (Acknowledge), `تم الحل` (Resolve).
- Ready Queue:
  - Real-time list from KDS ready events.

### B3. Arabic UI Labels (Examples)
- `الطلبات`
- `الطاولات`
- `الدفع`
- `إرسال للمطبخ`
- `نداء النادل`
- `قيد التحضير`
- `جاهز للتقديم`
- `تم الاستلام`

---

## C) Data Model (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}

enum OrderType {
  DINE_IN
  TAKEAWAY
  PICKUP
  DELIVERY_PICKUP
}

enum OrderStatus {
  DRAFT
  CONFIRMED
  IN_KITCHEN
  READY
  SERVED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  CONFIRMED
  FAILED
  REFUNDED
}

enum KitchenTicketStatus {
  NEW
  COOKING
  READY
  SERVED
}

enum WaiterCallStatus {
  CREATED
  ACKNOWLEDGED
  RESOLVED
}

enum StockMovementType {
  IN
  OUT
  ADJUSTMENT
  WASTE
  TRANSFER
}

model Organization {
  id          String   @id @default(cuid())
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  branches    Branch[]
  users       User[]
  auditLogs   AuditLog[]

  @@index([name])
}

model Branch {
  id                     String   @id @default(cuid())
  organizationId         String
  code                   String
  name                   String
  timezone               String   @default("Asia/Riyadh")
  currency               String   @default("SAR")
  isQrOrderingEnabled    Boolean  @default(true)
  isWaiterCallEnabled    Boolean  @default(true)
  waiterCallCooldownSec  Int      @default(60)
  taxRateBps             Int      @default(1500)
  serviceChargeBps       Int      @default(0)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  organization           Organization @relation(fields: [organizationId], references: [id])
  devices                Device[]
  tables                 Table[]
  tableAreas             TableArea[]
  categories             Category[]
  products               Product[]
  stockLevels            StockLevel[]
  stockMovements         StockMovement[]
  orders                 Order[]
  kitchenTickets         KitchenTicket[]
  users                  UserBranch[]
  stations               Station[]
  waiterCalls            WaiterCall[]

  @@unique([organizationId, code])
  @@index([organizationId])
}

model Device {
  id             String   @id @default(cuid())
  branchId       String
  code           String
  name           String
  platform       String
  authTokenHash  String
  lastSeenAt     DateTime?
  createdAt      DateTime @default(now())

  branch         Branch   @relation(fields: [branchId], references: [id])

  @@unique([branchId, code])
  @@index([branchId])
}

model User {
  id             String      @id @default(cuid())
  organizationId String
  email          String      @unique
  phone          String?
  displayName    String
  passwordHash   String
  status         UserStatus  @default(ACTIVE)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])
  userRoles      UserRole[]
  branches       UserBranch[]
  auditLogs      AuditLog[]

  @@index([organizationId])
}

model Role {
  id           String           @id @default(cuid())
  code         String           @unique
  name         String
  userRoles    UserRole[]
  permissions  RolePermission[]
}

model Permission {
  id              String           @id @default(cuid())
  code            String           @unique
  description     String?
  rolePermissions RolePermission[]
}
model RolePermission {
  roleId        String
  permissionId  String

  role          Role       @relation(fields: [roleId], references: [id])
  permission    Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model UserRole {
  userId       String
  roleId       String

  user         User @relation(fields: [userId], references: [id])
  role         Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}

model UserBranch {
  userId       String
  branchId     String

  user         User   @relation(fields: [userId], references: [id])
  branch       Branch @relation(fields: [branchId], references: [id])

  @@id([userId, branchId])
}

model Category {
  id             String   @id @default(cuid())
  organizationId String
  branchId       String?
  nameAr         String
  nameEn         String?
  sortOrder      Int      @default(0)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  branch         Branch?  @relation(fields: [branchId], references: [id])

  @@index([organizationId])
  @@index([branchId, sortOrder])
}

model Product {
  id                    String   @id @default(cuid())
  organizationId        String
  branchId              String?
  categoryId            String
  sku                   String?
  nameAr                String
  nameEn                String?
  descriptionAr         String?
  descriptionEn         String?
  basePrice             Decimal  @db.Decimal(10, 2)
  isActive              Boolean  @default(true)
  requiresKitchen       Boolean  @default(true)
  inventoryItemId       String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  category              Category @relation(fields: [categoryId], references: [id])
  variants              Variant[]
  modifierGroups        ProductModifierGroup[]
  orderItems            OrderItem[]

  @@index([organizationId])
  @@index([branchId])
  @@index([categoryId])
  @@unique([organizationId, sku])
}

model Variant {
  id           String   @id @default(cuid())
  productId    String
  nameAr       String
  nameEn       String?
  priceDelta   Decimal  @db.Decimal(10, 2)
  isDefault    Boolean  @default(false)

  product      Product  @relation(fields: [productId], references: [id])

  @@index([productId])
}

model ModifierGroup {
  id             String   @id @default(cuid())
  organizationId String
  nameAr         String
  nameEn         String?
  minSelect      Int      @default(0)
  maxSelect      Int      @default(1)
  isRequired     Boolean  @default(false)

  options        ModifierOption[]
  products       ProductModifierGroup[]

  @@index([organizationId])
}

model ModifierOption {
  id              String   @id @default(cuid())
  modifierGroupId String
  nameAr          String
  nameEn          String?
  priceDelta      Decimal  @db.Decimal(10, 2)
  isActive        Boolean  @default(true)

  modifierGroup   ModifierGroup @relation(fields: [modifierGroupId], references: [id])

  @@index([modifierGroupId])
}

model ProductModifierGroup {
  productId       String
  modifierGroupId String

  product         Product       @relation(fields: [productId], references: [id])
  modifierGroup   ModifierGroup @relation(fields: [modifierGroupId], references: [id])

  @@id([productId, modifierGroupId])
}

model Supplier {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  phone          String?
  createdAt      DateTime @default(now())

  inventoryItems InventoryItem[]

  @@index([organizationId])
}

model InventoryItem {
  id             String   @id @default(cuid())
  organizationId String
  sku            String
  name           String
  unit           String
  reorderPoint   Decimal? @db.Decimal(10, 3)
  supplierId     String?
  createdAt      DateTime @default(now())

  supplier       Supplier? @relation(fields: [supplierId], references: [id])
  stockLevels    StockLevel[]
  stockMovements StockMovement[]

  @@unique([organizationId, sku])
  @@index([organizationId])
}

model StockLevel {
  id              String   @id @default(cuid())
  organizationId  String
  branchId        String
  inventoryItemId String
  quantity        Decimal  @db.Decimal(12, 3)
  updatedAt       DateTime @updatedAt

  branch          Branch        @relation(fields: [branchId], references: [id])
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])

  @@unique([branchId, inventoryItemId])
  @@index([organizationId, branchId])
}

model StockMovement {
  id              String            @id @default(cuid())
  organizationId  String
  branchId        String
  inventoryItemId String
  type            StockMovementType
  quantity        Decimal           @db.Decimal(12, 3)
  reason          String?
  refType         String?
  refId           String?
  createdByUserId String?
  createdAt       DateTime          @default(now())

  branch          Branch            @relation(fields: [branchId], references: [id])
  inventoryItem   InventoryItem     @relation(fields: [inventoryItemId], references: [id])

  @@index([organizationId, branchId, createdAt])
  @@index([inventoryItemId, createdAt])
}

model TableArea {
  id             String   @id @default(cuid())
  branchId       String
  nameAr         String
  nameEn         String?
  sortOrder      Int      @default(0)

  branch         Branch   @relation(fields: [branchId], references: [id])
  tables         Table[]

  @@index([branchId, sortOrder])
}
model Table {
  id             String   @id @default(cuid())
  branchId       String
  tableAreaId    String?
  code           String
  seats          Int      @default(2)
  isActive       Boolean  @default(true)

  branch         Branch    @relation(fields: [branchId], references: [id])
  area           TableArea? @relation(fields: [tableAreaId], references: [id])
  orders         Order[]
  waiterCalls    WaiterCall[]

  @@unique([branchId, code])
  @@index([branchId, tableAreaId])
}

model Order {
  id                 String      @id @default(cuid())
  organizationId     String
  branchId           String
  tableId            String?
  orderNo            String
  source             String
  type               OrderType
  status             OrderStatus @default(DRAFT)
  customerName       String?
  customerPhone      String?
  subtotal           Decimal     @db.Decimal(10, 2)
  taxAmount          Decimal     @db.Decimal(10, 2)
  serviceCharge      Decimal     @db.Decimal(10, 2)
  discountAmount     Decimal     @db.Decimal(10, 2)
  totalAmount        Decimal     @db.Decimal(10, 2)
  note               String?
  createdByUserId    String?
  deviceId           String?
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  branch             Branch      @relation(fields: [branchId], references: [id])
  table              Table?      @relation(fields: [tableId], references: [id])
  items              OrderItem[]
  payments           Payment[]
  statusHistory      OrderStatusHistory[]
  tickets            KitchenTicket[]

  @@unique([branchId, orderNo])
  @@index([organizationId, branchId, createdAt])
  @@index([status, createdAt])
}

model OrderItem {
  id                 String   @id @default(cuid())
  orderId            String
  productId          String
  variantId          String?
  itemNameAr         String
  qty                Decimal  @db.Decimal(10, 3)
  unitPrice          Decimal  @db.Decimal(10, 2)
  lineTotal          Decimal  @db.Decimal(10, 2)
  note               String?

  order              Order    @relation(fields: [orderId], references: [id])
  product            Product  @relation(fields: [productId], references: [id])
  modifiers          OrderItemModifier[]
  ticketItems        KitchenTicketItem[]

  @@index([orderId])
}

model OrderItemModifier {
  id                 String   @id @default(cuid())
  orderItemId        String
  modifierOptionId   String
  nameAr             String
  priceDelta         Decimal  @db.Decimal(10, 2)

  orderItem          OrderItem       @relation(fields: [orderItemId], references: [id])
  modifierOption     ModifierOption  @relation(fields: [modifierOptionId], references: [id])

  @@index([orderItemId])
}

model OrderStatusHistory {
  id             String      @id @default(cuid())
  orderId        String
  fromStatus     OrderStatus?
  toStatus       OrderStatus
  actorUserId    String?
  at             DateTime    @default(now())

  order          Order       @relation(fields: [orderId], references: [id])

  @@index([orderId, at])
}

model Station {
  id             String   @id @default(cuid())
  branchId       String
  code           String
  nameAr         String
  nameEn         String?

  branch         Branch   @relation(fields: [branchId], references: [id])
  ticketItems    KitchenTicketItem[]

  @@unique([branchId, code])
}

model KitchenTicket {
  id             String             @id @default(cuid())
  organizationId String
  branchId       String
  orderId        String
  status         KitchenTicketStatus @default(NEW)
  startedAt      DateTime?
  readyAt        DateTime?
  servedAt       DateTime?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  branch         Branch             @relation(fields: [branchId], references: [id])
  order          Order              @relation(fields: [orderId], references: [id])
  items          KitchenTicketItem[]

  @@index([branchId, status, createdAt])
}

model KitchenTicketItem {
  id             String   @id @default(cuid())
  ticketId       String
  orderItemId    String
  stationId      String?
  status         KitchenTicketStatus @default(NEW)

  ticket         KitchenTicket @relation(fields: [ticketId], references: [id])
  orderItem      OrderItem     @relation(fields: [orderItemId], references: [id])
  station        Station?      @relation(fields: [stationId], references: [id])

  @@index([ticketId, status])
  @@index([stationId, status])
}

model Payment {
  id                 String        @id @default(cuid())
  organizationId     String
  branchId           String
  orderId            String?
  method             String
  provider           String?
  status             PaymentStatus @default(PENDING)
  amount             Decimal       @db.Decimal(10, 2)
  currency           String        @default("SAR")
  externalRef        String?
  createdAt          DateTime      @default(now())
  confirmedAt        DateTime?

  branch             Branch        @relation(fields: [branchId], references: [id])
  order              Order?        @relation(fields: [orderId], references: [id])
  attempts           PaymentAttempt[]
  refunds            Refund[]

  @@index([organizationId, branchId, createdAt])
  @@unique([provider, externalRef])
}

model PaymentAttempt {
  id                 String      @id @default(cuid())
  paymentId          String
  providerEventId    String?
  requestId          String?
  status             PaymentStatus
  rawPayload         Json
  createdAt          DateTime    @default(now())

  payment            Payment     @relation(fields: [paymentId], references: [id])

  @@unique([providerEventId])
  @@index([paymentId, createdAt])
}

model Refund {
  id                 String   @id @default(cuid())
  paymentId          String
  amount             Decimal  @db.Decimal(10, 2)
  reason             String?
  createdAt          DateTime @default(now())

  payment            Payment  @relation(fields: [paymentId], references: [id])

  @@index([paymentId])
}

model WaiterCall {
  id                 String           @id @default(cuid())
  organizationId     String
  branchId           String
  tableId            String
  orderId            String?
  reason             String
  note               String?
  status             WaiterCallStatus @default(CREATED)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  branch             Branch           @relation(fields: [branchId], references: [id])
  table              Table            @relation(fields: [tableId], references: [id])
  events             WaiterCallEvent[]

  @@index([branchId, tableId, createdAt])
  @@index([status, createdAt])
}

model WaiterCallEvent {
  id                 String           @id @default(cuid())
  waiterCallId       String
  fromStatus         WaiterCallStatus?
  toStatus           WaiterCallStatus
  actorUserId        String?
  at                 DateTime         @default(now())

  waiterCall         WaiterCall       @relation(fields: [waiterCallId], references: [id])

  @@index([waiterCallId, at])
}

model AuditLog {
  id                 String   @id @default(cuid())
  organizationId     String
  branchId           String?
  userId             String?
  action             String
  entityType         String
  entityId           String?
  beforeJson         Json?
  afterJson          Json?
  ipAddress          String?
  userAgent          String?
  requestId          String?
  createdAt          DateTime @default(now())

  organization       Organization @relation(fields: [organizationId], references: [id])
  user               User?        @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt])
  @@index([branchId, createdAt])
  @@index([action, createdAt])
}
```

### Multi-tenant scoping rules
- Every business record includes `organizationId` and/or `branchId`.
- API middleware derives allowed `organizationId` + `branchIds` from JWT claims.
- All Prisma queries enforce scope in `where` clause.
- Unique keys are tenant-scoped (`organizationId + sku`, `branchId + orderNo`).

---

## D) API Design + Realtime Events

### D1. API Endpoints (REST)

#### Admin APIs (`/api/admin`)
- `GET /branches/:branchId/dashboard/kpis`
- `GET/POST /branches/:branchId/categories`
- `GET/POST /branches/:branchId/products`
- `PATCH/DELETE /branches/:branchId/products/:productId`
- `GET/POST /branches/:branchId/modifier-groups`
- `GET/POST /branches/:branchId/pricing-rules`
- `GET /branches/:branchId/inventory/items`
- `POST /branches/:branchId/inventory/movements`
- `GET/POST /organization/users`
- `PATCH /organization/users/:userId/roles`
- `GET/PATCH /branches/:branchId/settings`

#### POS APIs (`/api/pos`)
- `POST /devices/register`
- `GET /sync/snapshot?branchId=...&since=...`
- `POST /sync/events` (batched events with `(deviceId, seq)`)
- `POST /orders`
- `PATCH /orders/:orderId`
- `POST /orders/:orderId/send-to-kitchen`
- `POST /print/receipt`

#### Customer APIs (`/api/customer`)
- `GET /menu?branchId=...&tableId=...&token=...`
- `POST /checkout/session`
- `GET /orders/:orderId/status`
- `POST /waiter-calls`
- `POST /request-bill` (optional)

#### Payment APIs (`/api/payments`)
- `POST /session` (provider-agnostic)
- `POST /webhooks/moyasar`
- `POST /webhooks/tap`

#### KDS APIs (`/api/kds`)
- `GET /tickets?branchId=...&station=...`
- `PATCH /tickets/:ticketId/status`
- `PATCH /ticket-items/:ticketItemId/status`

#### Waiter APIs (`/api/waiter`)
- `GET /calls?branchId=...&status=...`
- `PATCH /calls/:callId/ack`
- `PATCH /calls/:callId/resolve`

### D2. WebSocket Channels
- Namespace: `/rt`
- Rooms:
  - `branch:{branchId}`
  - `kds:{branchId}`
  - `waiter:{branchId}`
  - `order:{orderId}`
### D3. Event Payload JSON (Examples)

```json
{
  "event": "ORDER_CREATED",
  "idempotencyKey": "dev_01-1042",
  "correlationId": "req_8f31f4",
  "branchId": "br_123",
  "order": {
    "id": "ord_1",
    "orderNo": "A-1024",
    "type": "DINE_IN",
    "tableCode": "T12",
    "totalAmount": 86.5,
    "status": "CONFIRMED"
  },
  "occurredAt": "2026-02-16T10:45:02.421Z"
}
```

```json
{
  "event": "KITCHEN_TICKET_UPDATED",
  "idempotencyKey": "kt_778-status-3",
  "correlationId": "req_8f31f4",
  "branchId": "br_123",
  "ticket": {
    "id": "kt_778",
    "status": "READY",
    "station": "GRILL",
    "elapsedSec": 510
  },
  "occurredAt": "2026-02-16T10:53:31.100Z"
}
```

```json
{
  "event": "WAITER_CALL_CREATED",
  "idempotencyKey": "wc_t12_202602161054",
  "correlationId": "req_b25aa9",
  "branchId": "br_123",
  "waiterCall": {
    "id": "wc_99",
    "tableId": "tbl_12",
    "tableCode": "T12",
    "reason": "WATER",
    "status": "CREATED",
    "note": "2 glasses"
  },
  "occurredAt": "2026-02-16T10:54:11.000Z"
}
```

### Event list
- `ORDER_CREATED`
- `ORDER_UPDATED`
- `ORDER_STATUS_CHANGED`
- `KITCHEN_TICKET_CREATED`
- `KITCHEN_TICKET_UPDATED`
- `PAYMENT_CREATED`
- `PAYMENT_CONFIRMED`
- `WAITER_CALL_CREATED`
- `WAITER_CALL_ACKNOWLEDGED`
- `WAITER_CALL_RESOLVED`

---

## E) Payment Integration (Moyasar + Tap)

### E1. Provider Adapter Interface

```ts
export interface PaymentProvider {
  name: "moyasar" | "tap";
  createSession(input: {
    branchId: string;
    amount: number;
    currency: string;
    orderDraftId?: string;
    returnUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ sessionId: string; checkoutUrl: string; externalRef: string }>;

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;

  parseWebhookEvent(rawBody: string): {
    eventId: string;
    externalRef: string;
    status: "CONFIRMED" | "FAILED" | "PENDING";
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
  };
}
```

### E2. Atomic Confirmation Flow
- `Pay Now` -> `POST /api/payments/session`
- Redirect to provider
- Provider webhook -> backend verifies signature
- Idempotency check by `eventId`
- DB transaction:
  - upsert `PaymentAttempt` (eventId)
  - update `Payment` to `CONFIRMED`
  - create `Order` if not exists
  - create `KitchenTicket`
- Emit realtime events (`PAYMENT_CONFIRMED`, `ORDER_CREATED`, `KITCHEN_TICKET_CREATED`)

### E3. Webhook Security + Idempotency
- Validate signature header per provider secret.
- Store provider `eventId` unique; ignore duplicates.
- Reject stale timestamps (>5 minutes) when supported.
- Log failed verifications with requestId and source IP.

### E4. Short Webhook Handler Pseudocode

```ts
async function handleWebhook(provider: PaymentProvider, rawBody: string, headers: Record<string, string>) {
  if (!provider.verifyWebhookSignature(rawBody, headers)) return { status: 401 };

  const evt = provider.parseWebhookEvent(rawBody);

  return prisma.$transaction(async (tx) => {
    const exists = await tx.paymentAttempt.findUnique({ where: { providerEventId: evt.eventId } });
    if (exists) return { status: 200, deduped: true };

    await tx.paymentAttempt.create({
      data: { paymentId: "resolved_payment_id", providerEventId: evt.eventId, status: evt.status, rawPayload: JSON.parse(rawBody) }
    });

    if (evt.status === "CONFIRMED") {
      // confirm payment + create order + create kitchen tickets atomically
    }

    return { status: 200 };
  });
}
```

### E5. POS NFC Integration Pattern
- Android `PaymentTerminalAdapter` abstraction:
  - `startSale(amount, currency, ref)`
  - `cancelSale(ref)`
  - callback `onResult(success, terminalTxnId)`
- Implementation variants:
  - Intent-based terminal apps
  - SDK-based embedded terminal
- POS stores pending external payment locally and reconciles on sync.

---

## F) Offline-First POS Sync Engine

### F1. Local Event Table (Room)
- `LocalEvent(id, deviceId, seq, type, payloadJson, createdAt, syncedAt, hash)`
- Unique: `(deviceId, seq)`

### F2. Protocol
1. Device register -> receives scoped token + config.
2. Pull snapshot:
   - catalog
   - prices
   - modifiers
   - table map
3. Push events in batches (e.g., 100 max):
   - `ORDER_CREATE`
   - `ORDER_UPDATE`
   - `PAYMENT_CAPTURED`
   - `TABLE_TRANSFER`
4. Server applies idempotently by `(deviceId, seq)`.
5. Server returns:
   - acked seqs
   - rejected seqs + reason
   - server-side updates since cursor

### F3. Conflict Rules
- Catalog/pricing: server wins.
- Sales events: device wins if valid and unique `(deviceId, seq)`.
- Duplicates: rejected as already applied.

### F4. Failure Handling
- Exponential backoff (2s, 5s, 15s, 30s, 60s max).
- Partial ack supported; client marks only acked rows `syncedAt`.
- Offline print queue retries printer adapter.
- Local crash recovery via durable Room transactions.

### F5. Security
- Device JWT short-lived + refresh token rotation.
- Token bound to `deviceId` and branch scope.
- Revoke compromised device token from admin.

---

## G) Kitchen Routing + Stations
- Product has default station mapping (`DRINKS`, `GRILL`, `DESSERT`, `PASS`).
- On order confirmation:
  - Create one `KitchenTicket` per order
  - Create `KitchenTicketItem` per order item with `stationId`
- KDS modes:
  - Unified board (filter by station)
  - Station board (only assigned station)
- SLA rules:
  - > 8 min: warning
  - > 12 min: danger highlight + optional sound alert

---

## H) Call Waiter Feature

### H1. UX
- Persistent floating button: `نداء النادل`.
- Modal fields:
  - Reason radio group: Assistance/Water/Bill/Other
  - Optional note input
  - Submit CTA: `إرسال الطلب`

### H2. Rate Limiting
- Rule: max 1 request per table per 60s (branch-configurable).
- Enforce in API + Redis key `waiter_call:{branchId}:{tableId}`.

### H3. Staff Notifications
- On create:
  - emit to `waiter:{branchId}`
  - optional admin toast in dashboard

### H4. Lifecycle + Logging
- `CREATED -> ACKNOWLEDGED -> RESOLVED`
- Persist actor user ID + timestamps in `WaiterCallEvent`.

### H5. Abuse Prevention
- No CAPTCHA by default.
- Security relies on signed table token + rate limit.

### H6. QR Table Binding
- QR payload: `{ branchId, tableId, exp, sig }`
- Signature: HMAC-SHA256 using branch secret.
- Reject if expired or invalid signature.

---

## I) Security / Compliance / Observability

### I1. Auth + RBAC
- JWT access (15m) + refresh (7d rotating).
- Middleware checks permission codes per route.
- Session invalidation on password reset / role downgrade.

### I2. Tenant Isolation
- All reads/writes include scope checks.
- Background jobs also carry tenant context.
- No cross-branch joins without explicit owner permission.

### I3. Web Security
- CSRF protection for cookie-based admin/customer sessions.
- Strict CORS allowlist per environment.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax/Strict`.

### I4. Data Protection
- TLS in transit mandatory.
- Optional column encryption for sensitive fields.
- Payment secrets stored in KMS/secret manager.

### I5. Observability
- Structured logs with `requestId`, `correlationId`, `tenantId`.
- Metrics:
  - order throughput
  - payment success/failure ratio
  - sync error rate
  - KDS SLA breaches
  - waiter call response time
- Tracing across API -> queue -> websocket emit.
- Audit logs for discounts, voids, refunds, overrides, stock adjustments, table transfer.

---

## Wireframe-Style ASCII Layouts

### Customer Web (Mobile)
```text
+-----------------------------------+
| Logo        طاولة T12    [AR/EN]  |
| [Search: ابحث في القائمة...]       |
| [مشروبات] [وجبات] [حلويات]        |
|-----------------------------------|
| كابتشينو              18 ر.س [+]   |
| برغر لحم              42 ر.س [+]   |
| بطاطس                 12 ر.س [+]   |
|-----------------------------------|
| السلة (2) 60 ر.س       [عرض السلة] |
| [نداء النادل] [طلب الحساب]        |
+-----------------------------------+
```

### KDS Web
```text
+------------------------------------------------------------------+
| Filters: [All] [Drinks] [Grill] [Dessert]   SLA Alert >12m       |
+------------------+------------------+------------------+----------+
| جديد             | قيد التحضير      | جاهز             | تم التقديم |
| #A1024 T12 03:10 | #A1018 T5 07:44  | #A1009 T3 02:01  | #A0998 T7 |
| Burger x2        | Pasta x1         | Latte x2         | ...      |
| Note: no onion   |                  |                  |          |
+------------------+------------------+------------------+----------+
```

### Android POS
```text
+----------------------------------------------------------------+
| Branch: Riyadh Main | Shift: Open | Search [.................] |
+-------------------------------+--------------------------------+
| Categories                    | Cart                           |
| [قهوة] [برغر] [حلويات]        | 1x Latte            18         |
|                               | 2x Burger           84         |
| Product Grid                  | Tax                 15         |
| [Latte] [Espresso] [Mocha]    | Total              117         |
| [Burger] [Fries] [Salad]      | [إرسال للمطبخ] [الدفع]         |
+-------------------------------+--------------------------------+
```

---

## J) MVP Roadmap + Engineering Breakdown

### Phase 1 (MVP)
#### Backend/API
- Tenant-aware auth + RBAC + branch scoping middleware.
- Catalog/products/modifiers APIs.
- Orders/payments/waiter calls/KDS APIs.
- Socket.IO real-time channels.
- Webhook handlers for Moyasar/Tap.
- Audit log + metrics baseline.

#### Admin Web
- Login + branch switch.
- Catalog CRUD + pricing rules + branch settings.
- Users/roles management.
- Inventory basic stock movement + low stock list.

#### Customer Web
- QR menu + cart + checkout.
- Payment session flow + real-time tracking.
- Persistent call waiter + request bill button.

#### KDS Web
- Ticket board + station filtering.
- Status transitions + timers.

#### Android POS
- Offline catalog cache + cart + order create.
- Local event log + sync worker.
- Cash + external NFC terminal adapter integration.
- Receipt printing integration.

#### QA/Testing
- Unit tests for pricing, permissions, state transitions.
- Integration tests for payments/webhooks idempotency.
- E2E tests for cashier -> kitchen -> customer tracking.
- Load test for websocket fanout and sync endpoint.

### Phase 2
- Recipe-based ingredient deduction.
- Advanced inventory (purchase orders, wastage analytics).
- Loyalty and coupons.
- Rich operational reports.

### Phase 3
- Multi-branch consolidated analytics.
- Accounting exports (ERP-ready).
- Advanced promotions engine and segmentation.

---

## Implementation Notes
- Realtime choice: `Socket.IO` selected for robust reconnects, namespaces/rooms, and client support across Android/Web.
- Use outbox pattern for reliable event publish after DB transaction.
- Prefer decimal math server-side for currency.
- Keep provider adapters isolated to avoid coupling business logic to payment vendor payloads.
