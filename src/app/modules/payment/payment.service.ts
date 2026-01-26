// ...existing code...
import Stripe from "stripe";
import stripe from "../../../config/stripe";
import config from "../../../config";
import { Booking } from "../booking/booking.model";
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  PayoutStatus,
  RefundStatus,
} from "./transaction.model";
import { BOOKING_STATUS, CAR_STATUS } from "../booking/booking.interface";
import { InitiatePaymentDto } from "./payment.interface";
import { User } from "../user/user.model";
import mongoose from "mongoose";

const COMMISSION_RATE = 0.15; // 15% commission

const createCheckoutSession = async (input: InitiatePaymentDto) => {
  const { bookingId, customerEmail, customerName, customerPhone } = input;

  const booking = await Booking.findById(bookingId).populate("carId");
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== BOOKING_STATUS.PENDING)
    throw new Error("Booking already paid or canceled");

  const session = await stripe.checkout.sessions.create({
    payment_method_types: [PaymentMethod.CARD],
    mode: "payment",
    success_url: `${process.env.BASE_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/api/payments/cancel`,
    customer_email: customerEmail,
    client_reference_id: bookingId,
    metadata: { booking_id: bookingId },
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${(booking.carId as any).brand} ${(booking.carId as any).model} (${(booking.carId as any).licensePlate})`,
            description: `Booking ID is #${bookingId} for ${(booking.carId as any).brand}, ${(booking.carId as any).model}, ${(booking.carId as any).year}, ${(booking.carId as any).color}`,
          },
          unit_amount: Math.round(booking.totalAmount * 100),
        },
        quantity: 1,
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: "required",
  });

  // await Transaction.create({
  //   bookingId: booking._id,
  //   amount: booking.totalAmount,
  //   method: PaymentMethod.CARD,
  //   stripeSessionId: session.id,
  //   status: TransactionStatus.PENDING,
  // });
  await Transaction.create({
    bookingId: booking._id,
    amount: booking.totalAmount,
    method: PaymentMethod.CARD,
    stripeSessionId: session.id,
    status: TransactionStatus.PENDING,
  }).then(async (trx) => {
    await Booking.findByIdAndUpdate(booking._id, {
      transactionId: trx._id,
    });
  });

  // 29,30 ai 2 diner vitore ai agents site ar kaj complete korte hobe frontend
  // 29, 30 ai 2 diner maje final plan korte hobe agami 1year ar
  // 2026 -> per week a 2 days martial arts practice abong noton kiso sikhte hobe
  // 2026 -> jan ar vitore frontend sesh korte hobe
  // 2026 -> jan ar 1 weak ar vitore fb page ready korte hobe khuv e professional vabe

  const readBooks = () => {
    console.log("Reading books...");
    console.log("dashboard overview page, customer managements,order management,product management,chat,admin management,settings")
  }

  console.log("Stripe Checkout Session created:", session.id);

  console.log("stripe account ID:")

  return {
    success: true,
    paymentUrl: session.url!,
    sessionId: session.id,
  };
};

const handleWebhook = async (rawBody: Buffer, sig: string) => {
  let event: Stripe.Event;

  try {
    event = (stripe as unknown as Stripe).webhooks.constructEvent(
      rawBody,
      sig,
      config.stripe.webhookSecret as string
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return false;
  }

  // ================= PAYMENT SUCCESS =================

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId =
      session.client_reference_id || session.metadata?.booking_id;

    if (!bookingId) return false;

    const booking = await Booking.findById(bookingId);
    if (booking && booking.status === BOOKING_STATUS.PENDING) {
      booking.status = BOOKING_STATUS.PAID;

      // --------- CAR STATUS LOGIC (Rules) --------- //
      if (!booking.checkIn && !booking.checkOut) {
        booking.carStatus = CAR_STATUS.UPCOMING;
      }

      await booking.save();

      const paymentIntentId = session.payment_intent as string;

      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand: ["latest_charge"] }
      );

      const chargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id;

      if (!chargeId) {
        throw new Error("Stripe charge not generated");
      }

      await Transaction.findOneAndUpdate(
        { stripeSessionId: session.id },
        {
          status: TransactionStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
        }
      );

      return true;
    }
  }

  // ================= REFUND CONFIRMATION =================
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;

    await Transaction.findOneAndUpdate(
      { stripeChargeId: charge.id },
      {
        refundStatus: RefundStatus.SUCCEEDED,
        refundedAt: new Date(),
      }
    );

    return true;
  }

  // ================= STRIPE CONNECT ONBOARDING =================
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    await User.findOneAndUpdate(
      { connectedAccountId: account.id },
      {
        onboardingCompleted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
      }
    );

    return true;
  }

  return false;
};

// ================= PAYOUT TO HOST =================
// const payoutToHost = async (bookingId: string) => {
//   const booking = await Booking.findById(bookingId);
//   if (!booking || booking.payoutProcessed || !booking.checkOut) return;

//   const host = await User.findById(booking.hostId);
//   console.log("Host info:", host);
//   if (!host?.connectedAccountId || !host.payoutsEnabled) {
//     throw new Error("Host payout not enabled");
//   }

//   const transaction = await Transaction.findById(booking.transactionId);
//   if (!transaction || transaction.status !== TransactionStatus.SUCCEEDED) {
//     throw new Error("Payment not completed");
//   }
//   if (!transaction.stripeChargeId) {
//     throw new Error("Stripe charge not found");
//   }

//   // const commission = Math.round(transaction.amount * COMMISSION_RATE);
//   // const payoutAmount = transaction.amount - commission;
//   const commission = Math.round(transaction.amount * COMMISSION_RATE * 100);
//   const payoutAmount = transaction.amount * 100 - commission;

//   const transfer = await stripe.transfers.create({
//     amount: payoutAmount,
//     currency: transaction.currency,
//     destination: host.connectedAccountId,
//     // source_transaction: transaction.stripePaymentIntentId!,
//     source_transaction: transaction.stripeChargeId,
//   });

//   await Transaction.findByIdAndUpdate(transaction._id, {
//     commissionAmount: commission,
//     payoutStatus: PayoutStatus.SUCCEEDED,
//     stripeTransferId: transfer.id,
//     hostReceiptAmount: payoutAmount,
//   });

//   await Booking.findByIdAndUpdate(bookingId, {
//     payoutProcessed: true,
//     payoutAt: new Date(),
//   });
// };

const payoutToHost = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.payoutProcessed) return;

  const transaction = await Transaction.findById(booking.transactionId);
  if (!transaction || transaction.status !== TransactionStatus.SUCCEEDED)
    return;

  const isEligibleForPayout =
    booking.checkOut === true ||
    (booking.status === BOOKING_STATUS.CANCELLED &&
      (transaction.refundAmount ?? 0) > 0);

  if (!isEligibleForPayout) return;

  const host = await User.findById(booking.hostId);
  if (!host?.connectedAccountId || !host.payoutsEnabled) {
    throw new Error("Host payout not enabled");
  }

  const refundedAmount = transaction.refundAmount ?? 0; // USD
  const effectiveAmount = transaction.amount - refundedAmount;

  // Full refund → host gets nothing
  if (effectiveAmount <= 0) {
    await Booking.findByIdAndUpdate(bookingId, { payoutProcessed: true });
    await Transaction.findByIdAndUpdate(transaction._id, {
      payoutStatus: PayoutStatus.SUCCEEDED,
    });
    return;
  }

  const commission = Math.round(effectiveAmount * COMMISSION_RATE * 100); // cents
  const payoutAmount = Math.round(effectiveAmount * 100) - commission;

  const transfer = await stripe.transfers.create({
    amount: payoutAmount,
    currency: transaction.currency,
    destination: host.connectedAccountId,
    source_transaction: transaction.stripeChargeId!,
  });

  await Transaction.findByIdAndUpdate(transaction._id, {
    commissionAmount: Math.round(effectiveAmount * COMMISSION_RATE),
    payoutStatus: PayoutStatus.SUCCEEDED,
    stripeTransferId: transfer.id,
    hostReceiptAmount: payoutAmount / 100,
  });

  await Booking.findByIdAndUpdate(bookingId, {
    payoutProcessed: true,
    payoutAt: new Date(),
  });
};

// ================ Refund  =================

const refundBookingPayment = async (
  booking: any,
  transaction: any,
  refundPercentage: number,
  session: mongoose.ClientSession
) => {
  if (!transaction.stripeChargeId) {
    throw new Error("Stripe charge not found");
  }

  const refundAmountInCents = Math.round(
    transaction.amount * refundPercentage * 100
  );

  //  Stripe call (EXTERNAL)
  const refund = await stripe.refunds.create(
    {
      charge: transaction.stripeChargeId,
      amount: refundAmountInCents,
    },
    {
      idempotencyKey: `refund_${booking._id}`,
    }
  );

  //  DB update (ATOMIC via session)
  transaction.refundId = refund.id;
  transaction.refundAmount = refundAmountInCents / 100;
  transaction.refundStatus = RefundStatus.PENDING;
  transaction.status = TransactionStatus.CANCELED;

  await transaction.save({ session });

  //  Optional but useful response
  return {
    refundId: refund.id,
    refundAmount: refundAmountInCents / 100,
    refundPercentage: refundPercentage * 100,
  };
};




// -------- Export as object ----------

export const PaymentService = {
  createCheckoutSession,
  handleWebhook,
  payoutToHost,
  refundBookingPayment,
};
