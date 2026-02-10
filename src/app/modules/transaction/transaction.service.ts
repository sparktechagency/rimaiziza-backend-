import stripe from "../../../config/stripe";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { TRANSACTION_STATUS } from "./transaction.interface";
import { Transaction } from "./transaction.model";

const refundBooking = async (bookingId: string) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    const transaction = await Transaction.findOne({ bookingId });
    await stripe.refunds.create({ payment_intent: transaction!.stripePaymentIntentId! });

    transaction!.status = TRANSACTION_STATUS.REFUNDED;
    await transaction!.save();

    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    await booking.save();
};

export const TransactionServices = {
    refundBooking,
}
