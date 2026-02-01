import { model, Schema, Types } from "mongoose";
import { BOOKING_STATUS, IBooking } from "./booking.interface";

const bookingSchema = new Schema<IBooking>(
    {
        bookingId: {
            type: String,
            required: true,
            unique: true
        },
        carId: {
            type: Schema.Types.ObjectId,
            ref: "Car",
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        hostId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction"
        },
        nidFrontPic: {
            type: String,
            required:false
        },
         nidBackPic: {
            type: String,
            required:false
        },
        drivingLicenseFrontPic: {
            type: String,
            required:false
        },
        drivingLicenseBackPic: {
            type: String,
            required:false
        },
        isCanceledByUser: {
            type: Boolean,
            default: false
        },
        isCanceledByHost: {
            type: Boolean,
            default: false
        },
        isSelfBooking: {
            type: Boolean,
            default: false
        },
        fromDate: {
            type: Date,
            required: true
        },
        toDate: {
            type: Date,
            required: true
        },
        extendedHours: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            required: true
        },
        bookingStatus: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.REQUESTED,
        },
        checkedOutAt: {
            type: Date
        },
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Indexes for common queries
bookingSchema.index({ carId: 1, bookingStatus: 1 });
bookingSchema.index({ userId: 1, bookingStatus: 1 });
bookingSchema.index({ hostId: 1, bookingStatus: 1 });

export const Booking = model<IBooking>("Booking", bookingSchema);