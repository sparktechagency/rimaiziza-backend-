import { model, Types } from "mongoose";
import { Schema } from "mongoose";
import { TRANSACTION_CURRENCY, TRANSACTION_STATUS, TRANSACTION_TYPE } from "./transaction.interface";

const transactionSchema = new Schema({
    bookingId: {
        type: Types.ObjectId,
        ref: "Booking",
        required: true
    },
    userId: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: TRANSACTION_CURRENCY.MYR
    },
    type: {
        type: String,
        enum: Object.values(TRANSACTION_TYPE),
        required: true
    },
    status: {
        type: String,
        enum: Object.values(TRANSACTION_STATUS),
        default: TRANSACTION_STATUS.INITIATED
    },
}, {
    timestamps: true,
    versionKey: false,
});

export const Transaction = model("Transaction", transactionSchema);