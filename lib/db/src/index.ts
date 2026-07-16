import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectDB(): Promise<typeof mongoose> {
  if (connectPromise) return connectPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set. Did you forget to provision a database?",
    );
  }

  connectPromise = mongoose.connect(uri);
  return connectPromise;
}

export * from "./models/product";
export * from "./models/hub";
export * from "./models/challenge";
export * from "./models/voting-room";
export * from "./models/user";
export * from "./models/look";
