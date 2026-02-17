export type RoleCode =
  | "OWNER"
  | "BRANCH_MANAGER"
  | "CASHIER"
  | "KITCHEN"
  | "WAITER_RUNNER"
  | "INVENTORY"
  | "ACCOUNTANT";

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "IN_KITCHEN"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type WaiterCallStatus = "CREATED" | "ACKNOWLEDGED" | "RESOLVED";

export interface EventEnvelope<TPayload> {
  event: string;
  correlationId: string;
  idempotencyKey?: string;
  branchId: string;
  occurredAt: string;
  payload: TPayload;
}
