import mongoose from "mongoose";
import { Schema } from "mongoose";

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

ngoSchema.index({ location: "2dsphere" });

export const NGO = mongoose.model("NGO", ngoSchema);
