import { Types } from "mongoose";

export enum BOOKING_STATUS {
  PENDING = "pending",
  PAID = "paid",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum Driver_STATUS {
  WITHDRIVER = "withDriver",
  WITHOUTDRIVER = "withoutDriver",
}

export enum CAR_STATUS {
  UPCOMING = "upcoming",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IBooking {
  _id: Types.ObjectId;
  carId: Types.ObjectId;
  userId: Types.ObjectId;
  hostId: Types.ObjectId;
  transactionId?: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  totalAmount: number;
  status: BOOKING_STATUS;
  carStatus?: CAR_STATUS;
  type?: Driver_STATUS;
  checkIn?: boolean;
  checkOut?: boolean;
  isCancelled?: boolean;
  payoutProcessed?: boolean;
  payoutAt?: Date;
  cancelledAt?: Date;
  checkedOutAt?: Date;
  createdAt: string;
  updatedAt: string;
}
