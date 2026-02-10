import stripe from "../../../config/stripe";
import { Booking } from "../booking/booking.model";
import { Charges } from "../charges/charges.model";
import { User } from "../user/user.model";
import { calculateFinalCharges } from "./calculateCharges";
import { PAYOUT_STATUS } from "./payout.interface";
import { Payout } from "./payout.model";

const autoHostPayout = async (bookingId: string) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;
    if (booking.bookingStatus !== "COMPLETED") return;

    // Prevent double payout
    const alreadyPaid = await Payout.findOne({ bookingId });
    if (alreadyPaid) return;

    const host = await User.findById(booking.hostId);
    if (!host?.isStripeOnboarded || !host.stripeConnectedAccountId) {
        throw new Error("Host Stripe not ready");
    }

    const charges = await Charges.findOne();
    if (!charges) return;


    const { hostAmount, adminAmount } = calculateFinalCharges(
        booking.totalAmount,
        charges.hostCommission
    );

    const transfer = await stripe.transfers.create({
        amount: hostAmount * 100,
        currency: process.env.CURRENCY!,
        destination: host.stripeConnectedAccountId,
        transfer_group: booking._id.toString(),
    });

    return await Payout.create({
        bookingId: booking._id,
        hostId: booking.hostId,
        totalAmount: booking.totalAmount,
        hostAmount,
        adminAmount,
        stripeTransferId: transfer.id,
        status: PAYOUT_STATUS.PENDING,
        paidAt: new Date(),
    });
};



export const PayoutServices = {
    autoHostPayout,
}

