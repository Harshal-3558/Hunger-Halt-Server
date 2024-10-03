// schemas.js
import mongoose from "mongoose";
import { Schema } from "mongoose";

// NGO Schema
const ngoSchema = new Schema({
  adminName: { type: String, require: true },
  adminEmail: { type: String, require: true },
  name: { type: String, require: true },
  email: { type: String, require: true },
  workingLocation: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  workingAddress: { type: String, require: true },
  foodStored: [
    {
      foodName: { type: String },
      foodQTY: { type: Number },
      foodShelf: { type: Number },
      remainingShelf: { type: Number },
    },
  ],
});

ngoSchema.index({ workingLocation: "2dsphere" });

// Work Schema
const workSchema = new Schema({
  donationID: { type: String, required: true },
  donorName: { type: String },
  donorAddress: { type: String },
  volunteerEmails: { type: Array },
});

// User Schema
const userSchema = new Schema({
  email: { type: String, unique: true },
  name: { type: String },
  role: { type: String },
  currentLocation: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  organization: { type: String },
  workingDays: { type: [String] },
  password: { type: String },
  FCMtoken: { type: String },
});

userSchema.index({ currentLocation: "2dsphere" });

// Export models
export const NGO = mongoose.model("NGO", ngoSchema);
export const Work = mongoose.model("Work", workSchema);
export const User = mongoose.model("User", userSchema);
