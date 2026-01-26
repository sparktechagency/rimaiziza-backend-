import { model, Schema, Model, Types } from "mongoose";
import { IBooking, BOOKING_STATUS, Driver_STATUS, CAR_STATUS } from "./booking.interface";

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    carId: { type: Schema.Types.ObjectId, ref: "Car", required: true },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    carStatus: { type: String, enum: Object.values(CAR_STATUS)},
    type: { type: String, enum: Object.values(Driver_STATUS), required: false },  
    checkIn: { type: Boolean, default: false },
    checkOut: { type: Boolean, default: false},
    isCancelled: { type: Boolean, default: false },
    payoutProcessed: { type: Boolean, default: false },
    payoutAt: { type: Date },
    cancelledAt: { type: Date },
    checkedOutAt: { type: Date },
  },

  
  { timestamps: true, versionKey: false }
);

// Indexes
bookingSchema.index({ userId: 1 });
bookingSchema.index({ hostId: 1 });

bookingSchema.index({ carId: 1 });

export const Booking: Model<IBooking> = model<IBooking>(
  "Booking",
  bookingSchema,
);
