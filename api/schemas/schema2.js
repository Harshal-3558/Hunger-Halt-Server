// schemas.js
import mongoose from "mongoose";
import { Schema } from "mongoose";

// NGO Schema
const ngoSchema = new Schema({
  adminName: { type: String, require: true },
  adminEmail: { type: String, require: true },
  name: { type: String, require: true },
  email: { type: String, require: true },
  regNo: { type: String },
  workingLocation: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  workingAddress: { type: String, require: true },
  foodStored: [
    {
      foodID: { type: String },
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
  aadhaar: { type: Number },
  phone: { type: Number },
  workingDays: { type: [String] },
  password: { type: String },
  FCMtoken: { type: String },
});

userSchema.index({ currentLocation: "2dsphere" });

//NGO Registration
const ngoRegistrationSchema = new Schema({
  ngoName: { type: String },
  regNo: {
    type: String,
    match: /^[A-Za-z0-9]+$/, // Allows letters and numbers only
  },
  address: { type: String },
});

//Biogas Registration
const biogasRegistrationSchema = new Schema({
  biogasName: { type: String },
  regNo: { type: String },
});

//Biogas User
const biogasUserSchema = new Schema({
  email: { type: String, unique: true },
  name: { type: String },
  regNo: { type: String },
  foodItem: { type: String },
  foodQTY: { type: Number },
});

// Export models
export const NGO = mongoose.model("NGO", ngoSchema);
export const Work = mongoose.model("Work", workSchema);
export const User = mongoose.model("User", userSchema);
export const NgoReg = mongoose.model("NgoRegistration", ngoRegistrationSchema);
export const BiogasReg = mongoose.model(
  "BiogasRegistration",
  biogasRegistrationSchema
);
export const BiogasUser = mongoose.model("BiogasUser", biogasUserSchema);
