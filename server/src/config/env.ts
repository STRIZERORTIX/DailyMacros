import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required (see server/.env.example)"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("dev-secret-change-me-please"),
  ALLOW_REGISTRATION: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  USDA_API_KEY: z.string().default(""),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
}).superRefine((config, context) => {
  if (Boolean(config.VAPID_PUBLIC_KEY) !== Boolean(config.VAPID_PRIVATE_KEY)) {
    context.addIssue({
      code: "custom",
      path: ["VAPID_PUBLIC_KEY"],
      message: "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must both be set or both be empty",
    });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Invalid environment:",
    parsed.error.issues.map((i) => `${i.path.map(String).join(".")}: ${i.message}`).join("; "),
  );
  process.exit(1);
}

export const env = parsed.data;
export const pushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (env.NODE_ENV === "production" && /dev-secret|change-me/.test(env.JWT_SECRET)) {
  console.error("Refusing to start in production with the placeholder JWT_SECRET.");
  process.exit(1);
}
