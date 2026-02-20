import { Types } from "mongoose";

export enum TRANSACTION_TYPE {
  BOOKING = "BOOKING",
  EXTEND = "EXTEND",
}

export enum TRANSACTION_STATUS {
  INITIATED = "INITIATED",
  SUCCESS = "SUCCESS",
  REFUNDED = "REFUNDED",
}

export enum TRANSACTION_CURRENCY {
  MYR = "MYR",
}

export interface ITransaction {
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  hostId: Types.ObjectId;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  type: TRANSACTION_TYPE;
  status: TRANSACTION_STATUS;
  charges: {
    platformFee: number;
    hostCommission: number;
    adminCommission: number;
  };
  extendToDate?: Date;
}
