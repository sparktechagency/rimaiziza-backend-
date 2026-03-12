"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = require("mongoose");
const transaction_interface_1 = require("./transaction.interface");
const transactionSchema = new mongoose_2.Schema({
    bookingId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Booking",
        required: true,
    },
    userId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    hostId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true,
    },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: transaction_interface_1.TRANSACTION_CURRENCY.MYR,
    },
    type: {
        type: String,
        enum: Object.values(transaction_interface_1.TRANSACTION_TYPE),
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(transaction_interface_1.TRANSACTION_STATUS),
        default: transaction_interface_1.TRANSACTION_STATUS.INITIATED,
    },
    charges: {
        platformFee: {
            type: Number,
            default: 0,
        },
        hostCommission: {
            type: Number,
            default: 0,
        },
        adminCommission: {
            type: Number,
            default: 0,
        },
    },
    extendToDate: {
        type: Date,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Transaction = (0, mongoose_1.model)("Transaction", transactionSchema);
