import { model, Schema, Types } from "mongoose";
import { BOOKING_STATUS, IBooking } from "./booking.interface";

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
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
    isCanceledByAdmin: {
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
    rentalPrice: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      required: true,
    },
    hostCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    adminCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.REQUESTED,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      required: false,
    },
    paidAt: {
      type: Date,
      required: false,
    },
    confirmedAt: {
      type: Date,
      required: false,
    },
    ongoingAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
    checkedInAt: {
      type: Date,
      required: false,
    },
    checkedOutAt: {
      type: Date,
      required: false,
    },
    extendHistory: {
      type: [
        {
          previousToDate: Date,
          newToDate: Date,
          transactionId: Types.ObjectId,
          extendedAt: Date,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for common queries
bookingSchema.index({ carId: 1, bookingStatus: 1 });
bookingSchema.index({ userId: 1, bookingStatus: 1 });
bookingSchema.index({ hostId: 1, bookingStatus: 1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
