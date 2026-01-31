import { Types } from "mongoose";

export enum BOOKING_STATUS {
    REQUESTED = "REQUESTED",
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    ONGOING = "ONGOING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
}



export interface IBooking {
    _id: Types.ObjectId;
    bookingId: string;
    carId: Types.ObjectId;
    userId: Types.ObjectId;
    hostId: Types.ObjectId;
    transactionId?: Types.ObjectId;
    isCanceledByUser?: boolean;
    isCanceledByHost?: boolean;
    fromDate: Date;
    toDate: Date;
    extendedHours?: number; // total hours extended
    totalAmount: number;
    bookingStatus: BOOKING_STATUS;
    checkedOutAt?: Date;
}
