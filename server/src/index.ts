import express from "express";
import type { RequestHandler } from "express";
import cors from "cors";
import { createRequire } from "node:module";
import { env } from "./config/env.js";
import { connectDb } from "./db.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { customFoodsRouter } from "./routes/customFoods.js";
import { foodsRouter } from "./routes/foods.js";
import { healthRouter } from "./routes/health.js";
import { insightsRouter } from "./routes/insights.js";
import { logsRouter } from "./routes/logs.js";
import { weightsRouter } from "./routes/weights.js";
import { remindersRouter } from "./routes/reminders.js";
import { startReminderScheduler } from "./services/reminders.js";

const app = express();
const helmet = createRequire(import.meta.url)("helmet") as () => RequestHandler;
app.set("trust proxy", 1); // correct client IPs (rate limiting) behind Render/Railway/Vercel proxies
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.use("/api", async (req, _res, next) => {
  if (req.path === "/auth/config" || req.path === "/health") {
    next();
    return;
  }
  try {
    await connectDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/logs", logsRouter);
app.use("/api/weights", weightsRouter);
app.use("/api/custom-foods", customFoodsRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/reminders", remindersRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use(errorHandler);

async function main() {
  await connectDb();
  startReminderScheduler();
  app.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}`));
}

if (process.env.VERCEL !== "1") {
  main().catch((err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
}

export default app;
