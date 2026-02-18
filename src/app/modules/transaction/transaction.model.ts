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
    hostId: {
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
    charges: {
        platformFee: {
            type: Number,
            default: 0
        },
        hostCommission: {
            type: Number,
            default: 0
        },
        adminCommission: {
            type: Number,
            default: 0
        }
    },
    extendToDate: {
        type: Date,
    },
}, {
    timestamps: true,
    versionKey: false,
});

export const Transaction = model("Transaction", transactionSchema);