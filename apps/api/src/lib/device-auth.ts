import crypto from "node:crypto";
import { prisma } from "./prisma";

export async function assertValidDevice(deviceId: string, token: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("DEVICE_NOT_FOUND");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  if (tokenHash !== device.authTokenHash) throw new Error("INVALID_DEVICE_TOKEN");

  return device;
}
