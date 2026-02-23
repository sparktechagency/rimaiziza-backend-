"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const booking_interface_1 = require("./booking.interface");
const bookingSchema = new mongoose_1.Schema({
    bookingId: {
        type: String,
        required: true,
        unique: true,
    },
    carId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Car",
        required: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    hostId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    transactionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Transaction",
    },
    nidFrontPic: {
        type: String,
        required: false,
    },
    nidBackPic: {
        type: String,
        required: false,
    },
    drivingLicenseFrontPic: {
        type: String,
        required: false,
    },
    drivingLicenseBackPic: {
        type: String,
        required: false,
    },
    depositAmount: {
        type: Number,
        required: false,
    },
    isDepositRefunded: {
        type: Boolean,
        default: false,
    },
    depositRefundableAt: {
        type: Date,
        required: false,
    },
    isCanceledByUser: {
        type: Boolean,
        default: false,
    },
    isCanceledByHost: {
        type: Boolean,
        default: false,
    },
    isSelfBooking: {
        type: Boolean,
        default: false,
    },
    fromDate: {
        type: Date,
        required: true,
    },
    toDate: {
        type: Date,
        required: true,
    },
    extendedHours: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    bookingStatus: {
        type: String,
        enum: Object.values(booking_interface_1.BOOKING_STATUS),
        default: booking_interface_1.BOOKING_STATUS.REQUESTED,
    },
    checkedInAt: {
        type: Date,
    },
    checkedOutAt: {
        type: Date,
    },
    extendHistory: {
        type: [
            {
                previousToDate: Date,
                newToDate: Date,
                transactionId: mongoose_1.Types.ObjectId,
                extendedAt: Date,
            },
        ],
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes for common queries
bookingSchema.index({ carId: 1, bookingStatus: 1 });
bookingSchema.index({ userId: 1, bookingStatus: 1 });
bookingSchema.index({ hostId: 1, bookingStatus: 1 });
exports.Booking = (0, mongoose_1.model)("Booking", bookingSchema);
