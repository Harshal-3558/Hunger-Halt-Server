import mongoose from "mongoose";
import { Schema } from "mongoose";

const foodSchema = new Schema(
  {
    foodName: { type: String, require: true },
    donorName: { type: String, require: true },
    donorEmail: { type: String, require: true },
    qty: { type: Number, require: true },
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
    assignedSpot: { type: String, require: true },
  },
  {
    timestamps: true, // Enable automatic timestamping
  }
);

foodSchema.index({ location: "2dsphere" });

export const Food = mongoose.model("Food", foodSchema);
