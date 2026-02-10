import { model, Schema, Types } from "mongoose";
import { PAYOUT_STATUS } from "./payout.interface";

const payoutSchema = new Schema({
    bookingId: {
        type: Types.ObjectId,
        ref: "Booking",
        required: true
    },
    hostId: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    totalAmount: Number,
    adminCommission: Number,
    hostAmount: Number,
    stripeTransferId: String,
    status: {
        type: String,
        enum: Object.values(PAYOUT_STATUS),
        default: PAYOUT_STATUS.PENDING
    },
    paidAt: Date,
}, {
    timestamps: true,
    versionKey: false
});

export const Payout = model("Payout", payoutSchema);