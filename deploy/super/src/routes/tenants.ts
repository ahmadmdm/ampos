/**
 * Tenant (Organization) management routes.
 *
 * All routes require super-admin authentication.
 *
 * GET  /tenants              — list all orgs with subscription summary
 * GET  /tenants/:id          — single org detail with devices
 * POST /tenants              — create a new org + TenantMeta
 * PATCH /tenants/:id         — update TenantMeta (plan, maxDevices, expiry …)
 * PATCH /tenants/:id/suspend — suspend tenant access
 * PATCH /tenants/:id/activate— lift suspension
 * DELETE /tenants/:id/devices/:deviceId — revoke a device
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";

export const tenantsRouter = Router();

// ─── List all tenants ─────────────────────────────────────────────────────────

tenantsRouter.get("/", async (_req: Request, res: Response) => {
  const orgs = await prisma.organization.findMany({
    include: {
      tenantMeta: true,
      branches: {
        select: {
          id: true, code: true, name: true,
          _count: { select: { devices: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = orgs.map((org: any) => ({
    id:          org.id,
    name:        org.name,
    createdAt:   org.createdAt,
    deviceCount: org.branches.reduce((s: number, b: any) => s + (b._count?.devices ?? 0), 0),
    branchCount: org.branches.length,
    subscription: {
      plan:            org.tenantMeta?.plan            ?? "trial",
      maxDevices:      org.tenantMeta?.maxDevices       ?? 3,
      subscriptionEnd: org.tenantMeta?.subscriptionEnd  ?? null,
      isSuspended:     org.tenantMeta?.isSuspended      ?? false,
      contactEmail:    org.tenantMeta?.contactEmail     ?? null,
    },
  }));

  res.json({ data: result, total: result.length });
});

// ─── Single tenant detail ─────────────────────────────────────────────────────

tenantsRouter.get("/:id", async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where:   { id: req.params.id },
    include: {
      tenantMeta: true,
      branches: {
        include: {
          devices: {
            select: {
              id: true, code: true, name: true, platform: true, lastSeenAt: true, createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!org) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  res.json(org);
});

// ─── Create tenant ────────────────────────────────────────────────────────────

const CreateTenantSchema = z.object({
  name:         z.string().min(2),
  plan:         z.enum(["trial", "starter", "professional", "enterprise"]).optional(),
  maxDevices:   z.number().int().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  notes:        z.string().optional(),
});

tenantsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = CreateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, plan, maxDevices, contactEmail, contactPhone, notes } = parsed.data;

  const org = await prisma.organization.create({
    data: {
      name,
      tenantMeta: {
        create: {
          plan:         plan        ?? "trial",
          maxDevices:   maxDevices  ?? 3,
          contactEmail: contactEmail ?? null,
          contactPhone: contactPhone ?? null,
          notes:        notes        ?? null,
        },
      },
    },
    include: { tenantMeta: true },
  });

  res.status(201).json(org);
});

// ─── Update subscription meta ─────────────────────────────────────────────────

const UpdateMetaSchema = z.object({
  plan:              z.enum(["trial", "starter", "professional", "enterprise"]).optional(),
  maxDevices:        z.number().int().min(1).optional(),
  subscriptionStart: z.string().datetime().optional(),
  subscriptionEnd:   z.string().datetime().optional(),
  contactEmail:      z.string().email().optional(),
  contactPhone:      z.string().optional(),
  notes:             z.string().optional(),
});

tenantsRouter.patch("/:id", async (req: Request, res: Response) => {
  const parsed = UpdateMetaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const meta = await prisma.tenantMeta.upsert({
    where:  { organizationId: req.params.id },
    create: { organizationId: req.params.id, ...parsed.data },
    update: parsed.data,
  });

  res.json(meta);
});

// ─── Suspend tenant ───────────────────────────────────────────────────────────

tenantsRouter.patch("/:id/suspend", async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };

  const meta = await prisma.tenantMeta.upsert({
    where:  { organizationId: req.params.id },
    create: { organizationId: req.params.id, isSuspended: true, suspendReason: reason ?? null },
    update: { isSuspended: true, suspendReason: reason ?? null },
  });

  res.json({ message: "Tenant suspended", meta });
});

// ─── Activate (lift suspension) ───────────────────────────────────────────────

tenantsRouter.patch("/:id/activate", async (req: Request, res: Response) => {
  const meta = await prisma.tenantMeta.upsert({
    where:  { organizationId: req.params.id },
    create: { organizationId: req.params.id, isSuspended: false },
    update: { isSuspended: false, suspendReason: null },
  });

  res.json({ message: "Tenant activated", meta });
});

// ─── Revoke device ────────────────────────────────────────────────────────────

tenantsRouter.delete(
  "/:id/devices/:deviceId",
  async (req: Request, res: Response) => {
    // Verify device belongs to this org's branch
    const device = await prisma.device.findFirst({
      where: {
        id:   req.params.deviceId,
        branch: { organization: { id: req.params.id } },
      },
    });

    if (!device) { res.status(404).json({ error: "DEVICE_NOT_FOUND" }); return; }

    await prisma.device.delete({ where: { id: device.id } });
    res.json({ message: "Device revoked" });
  },
);
