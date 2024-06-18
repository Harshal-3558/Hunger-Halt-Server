import mongoose from "mongoose";
import { Schema } from "mongoose";

const foodSchema = new Schema({
  foodName: { type: String, require: true },
  donorName: { type: String, require: true },
  donorEmail: { type: String, require: true },
  qty: { type: Number, require: true },
  shelfLife: { type: Number, require: true },
  location: { type: Object, require: true },
  address: { type: String, require: true },
  foodQualityStatus: { type: String, default: "not verified", require: true },
  foodDonationStatus: { type: String, default: "pending", require: true },
  assignedSpot: { type: String, require: true },
});

export const Food = mongoose.model("Food", foodSchema);
