import mongoose from "mongoose";
import { Schema } from "mongoose";

const donorUpdates = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true },
  location: { type: Object, require: true },
  address: { type: String, require: true },
  requiredQTY: { type: Number, require: true },
  image: { type: String, require: true },
});

export const DonorUpdates = mongoose.model("DonorUpdates", donorUpdates);
