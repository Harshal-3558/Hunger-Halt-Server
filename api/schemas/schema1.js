import mongoose from "mongoose";
import { Schema } from "mongoose";

// Donor Updates Schema
const donorUpdatesSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true },
  location: { type: Object, require: true },
  address: { type: String, require: true },
  requiredQTY: { type: Number, require: true },
  image: { type: String, require: true },
});

// Food Schema
const foodSchema = new Schema(
  {
    foodName: { type: String, require: true },
    donorName: { type: String, require: true },
    donorEmail: { type: String, require: true },
    qty: { type: Number, require: true },
    beneficiary: { type: Number, require: true },
    shelfLife: { type: Number, require: true },
    location: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    address: { type: String, require: true },
    foodQualityStatus: { type: String, default: "not verified", require: true },
    foodDonationStatus: { type: String, default: "pending", require: true },
    foodExpired: { type: Boolean },
    remainingShelfLife: { type: String },
    assignedVolunteerName: { type: String, require: true },
    assignedVolunteerEmail: { type: String, require: true },
    hungerSpotID: { type: String, require: true },
    assignedSpotAddress: { type: String, require: true },
    assignedSpotCoord: {
      type: { type: String, default: "Point" },
      coordinates: [Number],
    },
    SpotID: { type: String },
  },
  {
    timestamps: true, // Enable automatic timestamping
  }
);

foodSchema.index({ location: "2dsphere" });

// Hunger Spot Schema
const hungerSpotSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true },
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  address: { type: String, require: true },
  remainingBeneficiary: { type: Number, require: true },
  image: { type: String, require: true },
  totalBeneficiary: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
});

hungerSpotSchema.index({ location: "2dsphere" });

// Export models
export const DonorUpdates = mongoose.model("DonorUpdates", donorUpdatesSchema);
export const Food = mongoose.model("Food", foodSchema);
export const HungerSpot = mongoose.model("HungerSpot", hungerSpotSchema);
