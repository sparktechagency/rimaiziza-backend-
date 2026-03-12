import { Types } from "mongoose";

export enum BOOKING_STATUS {
  REQUESTED = "REQUESTED",
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  ONGOING = "ONGOING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
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
  depositAmount?: number;
  drivingLicenseFrontPic?: string;
  drivingLicenseBackPic?: string;
  isDepositRefunded?: boolean;
  depositRefundableAt?: Date;
  isCanceledByUser?: boolean;
  isCanceledByHost?: boolean;
  isCanceledByAdmin?: boolean;
  isSelfBooking?: boolean;
  fromDate: Date;
  toDate: Date;
  extendedHours?: number; // total hours extended
  rentalPrice: number;
  platformFee: number;
  hostCommission: number;
  adminCommission: number;
  totalAmount: number;
  bookingStatus: BOOKING_STATUS;
  requestedAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  confirmedAt?: Date;
  ongoingAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  extendHistory?: {
    previousToDate: Date;
    newToDate: Date;
    transactionId: Types.ObjectId;
    extendedAt: Date;
  }[];
}
