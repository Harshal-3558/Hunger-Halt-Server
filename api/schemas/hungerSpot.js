import mongoose from "mongoose";
import { Schema } from "mongoose";

const hungerSpotSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true },
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  address: { type: String, require: true },
  requiredQTY: { type: Number, require: true },
  image: { type: String, require: true },
});

hungerSpotSchema.index({ location: "2dsphere" });

export const HungerSpot = mongoose.model("HungerSpot", hungerSpotSchema);
