import mongoose from "mongoose";
import { Schema } from "mongoose";

const workSchema = new Schema({
  donationID: { type: String, required: true },
  donorName: { type: String },
  donorAddress: { type: String },
  volunteerEmails: { type: Array },
});

export const Work = mongoose.model("Work", workSchema);
