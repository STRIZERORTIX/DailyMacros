import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false });

const registerSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().trim().max(80).optional(),
});
const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(100) });
const googleSchema = z.object({ credential: z.string().min(20).max(4000) });

const googleClient = new OAuth2Client();

/** Check a Google ID token (signature, expiry, and that it was issued for OUR client ID). Null if invalid. */
async function verifyGoogle(credential: string) {
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    return ticket.getPayload() ?? null;
  } catch {
    return null;
  }
}

const profileSchema = z
  .object({
    sex: z.enum(["male", "female"]),
    goalMode: z.enum(["lose", "maintain", "gain"]),
    age: z.number().int().min(10).max(100),
    heightCm: z.number().min(100).max(250),
    weightKg: z.number().min(30).max(300),
    goalWeightKg: z.number().min(30).max(300),
    activityFactor: z.number().min(1.1).max(2.2),
    maintenanceKcal: z.number().int().min(500).max(10000).nullable(),
    cutTargetKcal: z.number().int().min(500).max(10000).nullable(),
    deficitKcal: z.number().min(0).max(1000),
    calorieAdjustment: z.number().min(-1000).max(500),
    sundayMaintenance: z.boolean(),
    proteinPerKg: z.number().min(0.8).max(3),
  })
  .partial();
const updateMeSchema = z.object({ name: z.string().trim().max(80), profile: profileSchema }).partial();

function publicUser(doc: InstanceType<typeof User>) {
  const o = doc.toObject();
  return { id: String(o._id), email: o.email, name: o.name, profile: o.profile };
}

authRouter.post("/register", limiter, async (req, res) => {
  if (!env.ALLOW_REGISTRATION) throw new HttpError(403, "Registration is disabled");
  const b = registerSchema.parse(req.body);
  const email = b.email.toLowerCase().trim();
  if (await User.exists({ email })) throw new HttpError(409, "Email already registered");
  const user = await User.create({ email, passwordHash: await bcrypt.hash(b.password, 10), name: b.name ?? "" });
  res.status(201).json({ token: signToken(String(user._id)), user: publicUser(user) });
});

authRouter.post("/login", limiter, async (req, res) => {
  const b = loginSchema.parse(req.body);
  const user = await User.findOne({ email: b.email.toLowerCase().trim() });
  if (user && !user.passwordHash) {
    throw new HttpError(401, "This account uses Google sign-in. Use the Google button.");
  }
  if (!user || !(await bcrypt.compare(b.password, user.passwordHash ?? ""))) {
    throw new HttpError(401, "Invalid email or password");
  }
  res.json({ token: signToken(String(user._id)), user: publicUser(user) });
});

// Public: tells the login screen whether to show the Google button and the "Create account" tab.
authRouter.get("/config", (_req, res) => {
  res.json({ googleClientId: env.GOOGLE_CLIENT_ID || null });
});

// The browser gets a Google ID token (the "credential") from the Google button and sends it here.
// We verify it ourselves, then issue our own login token, so nothing else in the app changes.
authRouter.post("/google", limiter, async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(503, "Google sign-in is not set up on the server");
  const { credential } = googleSchema.parse(req.body);

  const payload = await verifyGoogle(credential);
  if (!payload?.sub || !payload.email) throw new HttpError(401, "Google sign-in failed. Please try again.");
  if (!payload.email_verified) throw new HttpError(401, "Your Google email address is not verified.");

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ googleId: payload.sub });
  let isNewUser = false;
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      // Same verified email as an existing email/password account: link them.
      user.googleId = payload.sub;
      await user.save();
    } else {
      user = await User.create({ email, googleId: payload.sub, name: payload.name ?? "" });
      isNewUser = true;
    }
  }
  res.json({ token: signToken(String(user._id)), user: publicUser(user), isNewUser });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, "User no longer exists");
  res.json({ user: publicUser(user) });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const b = updateMeSchema.parse(req.body);
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};
  if (b.name !== undefined) set.name = b.name;
  for (const [k, v] of Object.entries(b.profile ?? {})) {
    if (v === null) unset[`profile.${k}`] = "";
    else if (v !== undefined) set[`profile.${k}`] = v;
  }
  const update = {
    ...(Object.keys(set).length > 0 ? { $set: set } : {}),
    ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
  };
  const user =
    Object.keys(update).length > 0
      ? await User.findByIdAndUpdate(req.userId, update, { new: true })
      : await User.findById(req.userId);
  if (!user) throw new HttpError(401, "User no longer exists");
  res.json({ user: publicUser(user) });
});
