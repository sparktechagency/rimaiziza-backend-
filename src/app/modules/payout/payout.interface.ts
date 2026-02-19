import { Types } from "mongoose";

export enum PAYOUT_STATUS {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

export interface IPayout {
  bookingId: Types.ObjectId;
  hostId: Types.ObjectId;
  totalAmount?: number;
  adminCommission?: number;
  hostAmount?: number;
  stripeTransferId?: string;
  status: PAYOUT_STATUS;
  paidAt?: Date;
}
