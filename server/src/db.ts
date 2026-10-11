import mongoose from "mongoose";
import { env } from "./config/env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log("MongoDB connected");
}

export function dbState(): string {
  // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  return ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
}
