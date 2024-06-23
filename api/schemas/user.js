import mongoose from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  role: { type: String },
  currentLocation: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  workingDays: { type: [String] }, // Specify the type of elements in the array
  password: { type: String, required: true },
});

userSchema.index({ currentLocation: "2dsphere" });

export const User = mongoose.model("User", userSchema);
