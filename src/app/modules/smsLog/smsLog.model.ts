import mongoose from "mongoose";
import { ISMSLog } from "./smsLog.interface";

const smsLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: { type: String, required: true },
    countryCode: { type: String, required: true },
    message: { type: String, required: true },
    resourceId: { type: String },
    status: { type: String, enum: ["PENDING", "DELIVERED", "FAILED"], default: "PENDING" },
    providerCode: { type: String },
    providerMessage: { type: String },
}, { timestamps: true });

export const SMSLog = mongoose.model<ISMSLog>("SMSLog", smsLogSchema);