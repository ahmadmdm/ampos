import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditInput = {
  tx?: Prisma.TransactionClient;
  organizationId: string;
  branchId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeJson?: Prisma.InputJsonValue;
  afterJson?: Prisma.InputJsonValue;
  requestId?: string;
};

export async function writeAudit(input: AuditInput) {
  const auditClient = input.tx ?? prisma;

  await auditClient.auditLog.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.beforeJson,
      afterJson: input.afterJson,
      requestId: input.requestId
    }
  });
}
