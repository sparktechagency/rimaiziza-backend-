import { BOOKING_STATUS } from "../../app/modules/booking/booking.interface";
import { Booking } from "../../app/modules/booking/booking.model";
import { PAYOUT_STATUS } from "../../app/modules/payout/payout.interface";
import { Payout } from "../../app/modules/payout/payout.model";
import { TRANSACTION_STATUS } from "../../app/modules/transaction/transaction.interface";
import { Transaction } from "../../app/modules/transaction/transaction.model";
import { User } from "../../app/modules/user/user.model";
import stripe from "../../config/stripe";





/** Helper: Handle checkout.session.completed */
export const handleCheckoutSessionCompleted = async (session: any) => {
    const transaction = await Transaction.findById(session.metadata.transactionId);
    if (!transaction) return;

    // Update transaction
    transaction.status = TRANSACTION_STATUS.SUCCESS;
    transaction.stripePaymentIntentId = session.payment_intent;
    await transaction.save();

    // Atomic booking update (race condition safe)
    const booking = await Booking.findOneAndUpdate(
        { _id: transaction.bookingId, bookingStatus: BOOKING_STATUS.PENDING },
        { bookingStatus: BOOKING_STATUS.CONFIRMED, transactionId: transaction._id },
        { new: true }
    );

    if (booking) console.log(`✅ Booking ${booking._id} confirmed`);
    else console.log(`⚠ Booking ${transaction.bookingId} already confirmed or invalid state`);
};

/** Helper: Handle transfer.paid */
const handleTransferPaid = async (transfer: any) => {
    const payout = await Payout.findOne({ stripeTransferId: transfer.id });
    if (!payout) return;

    payout.status = PAYOUT_STATUS.PAID;
    payout.paidAt = new Date(transfer.created * 1000);
    await payout.save();

    console.log(`✅ Payout ${payout._id} marked as PAID`);
};

/** Helper: Handle account.updated */
const handleAccountUpdated = async (account: any) => {
    console.log("Webhook received: account.updated");

    if (account.charges_enabled && account.requirements?.currently_due?.length === 0) {
        // Atomic update, idempotent
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

            case "transfer.paid":
                await handleTransferPaid(event.data.object);
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

