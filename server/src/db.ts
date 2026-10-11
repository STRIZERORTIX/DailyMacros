import mongoose from "mongoose";
import { env } from "./config/env.js";

let connection: Promise<typeof mongoose> | null = null;

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose;

  mongoose.set("strictQuery", true);
  if (!connection) {
    connection = mongoose
      .connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .then((connected) => {
        console.log("MongoDB connected");
        return connected;
      })
      .catch((error: unknown) => {
        connection = null;
        throw error;
      });
  }
  return connection;
}

export function dbState(): string {
  // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  return ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
}
