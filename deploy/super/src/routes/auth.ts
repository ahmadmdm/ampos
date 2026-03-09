/**
 * POST /auth/login
 *
 * Authenticates the super-admin using credentials from env vars.
 * Credentials are never stored in the database — they live in the container
 * environment only, which limits the blast radius of a DB compromise.
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { signSuperAdminToken } from "../middleware/auth";
import rateLimit from "express-rate-limit";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      10,
  message:  { error: "TOO_MANY_ATTEMPTS" },
});

authRouter.post("/login", loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  const expectedEmail    = process.env.SUPER_ADMIN_EMAIL        ?? "";
  const expectedPwdHash  = process.env.SUPER_ADMIN_PASSWORD_HASH ?? "";

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  // Always run bcrypt.compare to prevent timing-based user enumeration
  const isPasswordValid = await bcrypt.compare(password, expectedPwdHash);

  if (email !== expectedEmail || !isPasswordValid) {
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
    return;
  }

  const token = signSuperAdminToken();
  res.json({ token, expiresIn: "8h" });
});
