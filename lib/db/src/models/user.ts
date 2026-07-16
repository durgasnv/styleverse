import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
