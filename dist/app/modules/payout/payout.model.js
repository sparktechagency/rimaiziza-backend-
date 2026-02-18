"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payout = void 0;
const mongoose_1 = require("mongoose");
const payout_interface_1 = require("./payout.interface");
const payoutSchema = new mongoose_1.Schema({
    bookingId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Booking",
        required: true
    },
    hostId: {
        type: mongoose_1.Types.ObjectId,
        ref: "User",
        required: true
    },
    totalAmount: Number,
    adminCommission: Number,
    hostAmount: Number,
    stripeTransferId: String,
    status: {
        type: String,
        enum: Object.values(payout_interface_1.PAYOUT_STATUS),
        default: payout_interface_1.PAYOUT_STATUS.PENDING
    },
    paidAt: Date,
}, {
    timestamps: true,
    versionKey: false
});
exports.Payout = (0, mongoose_1.model)("Payout", payoutSchema);
