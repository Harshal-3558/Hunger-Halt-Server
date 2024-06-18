import mongoose from "mongoose";
import { Schema } from "mongoose";

const hungerSpotSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true },
  location: { type: Object, require: true },
  address: { type: String, require: true },
  requiredQTY: { type: Number, require: true },
  image: { type: String, require: true },
});

export const HungerSpot = mongoose.model("HungerSpot", hungerSpotSchema);
