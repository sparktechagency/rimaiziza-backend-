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
    nidFrontPic?: string;
    nidBackPic?: string;
    drivingLicenseFrontPic?: string;
    drivingLicenseBackPic?: string;
    isCanceledByUser?: boolean;
    isCanceledByHost?: boolean;
    isSelfBooking?: boolean;
    fromDate: Date;
    toDate: Date;
    extendedHours?: number; // total hours extended
    totalAmount: number;
    bookingStatus: BOOKING_STATUS;
    checkedInAt?: Date;
    checkedOutAt?: Date;
}