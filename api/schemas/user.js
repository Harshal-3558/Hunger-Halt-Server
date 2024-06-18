import mongoose from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, require: true, unique: true },
  name: { type: String },
  role: { type: String },
  currentLocation: { type: Object },
  workingDays: { type: Array },
  password: { type: String, require: true },
});

export const User = mongoose.model("User", userSchema);
