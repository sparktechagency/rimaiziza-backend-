import mongoose, { Document, Schema, Types } from "mongoose";

export enum TransactionStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  CANCELED = "canceled",
}

// export enum PaymentProvider {
//   CINETPAY = "cinetpay",
//   STRIPE = "stripe",
//   OTHER = "other",
// }

export enum PaymentMethod { CARD = "card", }

export enum PayoutStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}

export enum RefundStatus {
  NONE = "none",
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}

export enum PayoutType {
  FULL = "full",
  PARTIAL = "partial",
  NONE = "none",
}

export interface ITransaction extends Document {
  bookingId: Types.ObjectId | string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: TransactionStatus;
  externalRef?: string;
  // provider?: PaymentProvider;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;

    // NEW
  commissionAmount?: number;
  payoutStatus?: PayoutStatus;
  // Refund
  refundId?: string;
  refundAmount?: number;
  refundStatus?: RefundStatus;
  refundedAt?: Date;
  stripeTransferId?: string;
  stripeChargeId?: string,
  // payoutType?: PayoutType;
  hostReceiptAmount?: number;

  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    method: { type: String, enum: Object.values(PaymentMethod), default:  PaymentMethod.CARD },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    externalRef: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    //  NEW
    commissionAmount: { type: Number, default: 0 },
    payoutStatus: {
      type: String,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.PENDING,
    },
    // Refund
    refundId: { type: String },
    refundAmount: { type: Number, default: 0 },
    refundStatus: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.NONE,
    },
    refundedAt: { type: Date },
    stripeTransferId: { type: String },
    stripeChargeId: { type: String },
    // payoutType: { type: String, enum: Object.values(PayoutType) },

    hostReceiptAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;

