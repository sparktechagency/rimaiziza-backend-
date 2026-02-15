import { BOOKING_STATUS } from "../../app/modules/booking/booking.interface";
import { Booking } from "../../app/modules/booking/booking.model";
import { TRANSACTION_STATUS } from "../../app/modules/transaction/transaction.interface";
import { Transaction } from "../../app/modules/transaction/transaction.model";
import { User } from "../../app/modules/user/user.model";
import stripe from "../../config/stripe";

/** -------------------------- STRIPE WEBHOOK HELPERS -------------------------- */

/** Handle checkout.session.completed → confirm booking */
export const handleCheckoutSessionCompleted = async (session: any) => {
  const transaction = await Transaction.findById(session.metadata.transactionId);
  if (!transaction) return;

  // Update transaction
  transaction.status = TRANSACTION_STATUS.SUCCESS;
  transaction.stripePaymentIntentId = session.payment_intent;
  await transaction.save();

  // Atomic booking update
  const booking = await Booking.findOneAndUpdate(
    { _id: transaction.bookingId, bookingStatus: BOOKING_STATUS.PENDING },
    { bookingStatus: BOOKING_STATUS.CONFIRMED, transactionId: transaction._id },
    { new: true }
  );

  if (booking) console.log(`✅ Booking ${booking._id} confirmed`);
  else console.log(`⚠ Booking ${transaction.bookingId} already confirmed or invalid state`);
};

/** Handle host account.updated → mark onboarded */
const handleAccountUpdated = async (account: any) => {
  console.log("Webhook received: account.updated");

  if (account.charges_enabled && account.requirements?.currently_due?.length === 0) {
    const host = await User.findOneAndUpdate(
      { stripeConnectedAccountId: account.id, isStripeOnboarded: false },
      { isStripeOnboarded: true },
      { new: true }
    );

    if (host) console.log(`✅ Host onboarded: ${host._id}`);
    else console.log("No host found to update or already onboarded");
  } else {
    console.log("Account not ready for onboarding:", {
      charges_enabled: account.charges_enabled,
      currently_due: account.requirements?.currently_due,
    });
  }
};

/** Main Stripe webhook handler */
export const handleStripeWebhook = async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      default:
        console.log("Unhandled Stripe event type:", event.type);
    }
  } catch (err) {
    console.error("Error processing Stripe webhook:", err);
  }

  res.json({ received: true });
};

/** -------------------------- BOOKING STATUS HELPERS -------------------------- */

/** Move booking → ONGOING (Self / Confirmed) */
export const markBookingOngoing = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return;

  const now = new Date();
  if ((booking.bookingStatus === BOOKING_STATUS.CONFIRMED || booking.isSelfBooking) &&
      booking.fromDate <= now && booking.toDate > now &&
      !booking.isCanceledByUser && !booking.isCanceledByHost
  ) {
    booking.bookingStatus = BOOKING_STATUS.ONGOING;
    booking.checkedInAt = now;
    await booking.save();
    console.log(`Booking ${booking._id} marked as ONGOING`);
  }
};

/** Move booking → COMPLETED + schedule deposit refund + host commission payout */
export const markBookingCompleted = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId)
    .populate("carId")
    .populate("transactionId")
    .populate("hostId");
  if (!booking) return;

  const now = new Date();
  if (booking.bookingStatus === BOOKING_STATUS.ONGOING && booking.toDate <= now) {
    booking.bookingStatus = BOOKING_STATUS.COMPLETED;
    booking.checkedOutAt = now;

    // Schedule deposit refund 3 days later
    booking.depositRefundableAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    booking.isDepositRefunded = false;

    await booking.save();
    console.log(`Booking ${booking._id} marked COMPLETED, deposit refund scheduled`);

    // ------------------ HOST COMMISSION TRANSFER ------------------
    const transaction = booking.transactionId as any;
    const host = booking.hostId as any;

    if (transaction && host?.stripeConnectedAccountId && transaction.charges?.hostCommission) {
      try {
        await stripe.transfers.create({
          amount: Math.round(transaction.charges.hostCommission * 100), // cents
          currency: process.env.CURRENCY!,
          destination: host.stripeConnectedAccountId,
          description: `Host commission for booking ${booking._id}`,
          metadata: { bookingId: booking._id.toString(), transactionId: transaction._id.toString() },
        });

        console.log(`✅ Host commission transferred for booking ${booking._id}`);
      } catch (err: any) {
        console.error(`Failed to transfer host commission for booking ${booking._id}:`, err.message);
      }
    }
  }
};

/** Refund deposit if eligible (3 days after completion) */
export const refundDepositIfEligible = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId).populate("carId").populate("transactionId");
  if (!booking) return;

  const now = new Date();
  const car = booking.carId as any;
  const transaction = booking.transactionId as any;

  if (!car || !car.depositAmount || booking.isDepositRefunded) return;
  if (!transaction || !transaction.stripePaymentIntentId) return;
  if (!booking.depositRefundableAt || booking.depositRefundableAt > now) return;

  try {
    await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      amount: Math.round(car.depositAmount * 100), // Stripe expects cents
    });

    booking.isDepositRefunded = true;
    await booking.save();

    console.log(`Deposit refunded for booking ${booking._id}`);
  } catch (err: any) {
    console.error(`Failed to refund deposit for booking ${booking._id}:`, err.message);
  }
};

/** -------------------------- CRON JOB / SCHEDULED TASK -------------------------- */
export const bookingStatusCronJob = async () => {
  const now = new Date();

  // 1️⃣ Self booking REQUESTED → ONGOING
  const requestedBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.REQUESTED,
    isSelfBooking: true,
    fromDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of requestedBookings) {
    try {
      await markBookingOngoing(booking._id.toString());
    } catch (err: any) {
      console.warn(`Cannot move self booking ${booking._id} to ONGOING:`, err.message);
    }
  }

  // 2️⃣ CONFIRMED → ONGOING
  const confirmedBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    fromDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of confirmedBookings) {
    try {
      await markBookingOngoing(booking._id.toString());
    } catch (err: any) {
      console.warn(`Cannot move booking ${booking._id} to ONGOING:`, err.message);
    }
  }

  // 3️⃣ ONGOING → COMPLETED + schedule deposit
  const ongoingBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.ONGOING,
    toDate: { $lte: now },
    isCanceledByHost: { $ne: true },
    isCanceledByUser: { $ne: true },
  });

  for (const booking of ongoingBookings) {
    try {
      await markBookingCompleted(booking._id.toString());
    } catch (err: any) {
      console.warn(`Cannot move booking ${booking._id} to COMPLETED:`, err.message);
    }
  }

  // 4️⃣ Deposit refund eligible
  const refundableBookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.COMPLETED,
    depositRefundableAt: { $lte: now },
    isDepositRefunded: { $ne: true },
  });

  for (const booking of refundableBookings) {
    try {
      await refundDepositIfEligible(booking._id.toString());
    } catch (err: any) {
      console.warn(`Failed to refund deposit for booking ${booking._id}:`, err.message);
    }
  }
};
