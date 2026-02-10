import { BOOKING_STATUS } from "../../app/modules/booking/booking.interface";
import { Booking } from "../../app/modules/booking/booking.model";
import { TRANSACTION_STATUS } from "../../app/modules/transaction/transaction.interface";
import { Transaction } from "../../app/modules/transaction/transaction.model";
import { User } from "../../app/modules/user/user.model";
import stripe from "../../config/stripe";

export const stripeWebhook = async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session: any = event.data.object;
      const transaction = await Transaction.findById(session.metadata.transactionId);
      if (!transaction) break;

      transaction.status = TRANSACTION_STATUS.SUCCESS;
      transaction.stripePaymentIntentId = session.payment_intent;
      await transaction.save();

      await Booking.findByIdAndUpdate(transaction.bookingId, {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        transactionId: transaction._id,
      });
      break;
    }

    case "account.updated": {
      const account: any = event.data.object;
      if (account.charges_enabled && account.requirements.currently_due.length === 0) {
        const host = await User.findOne({ stripeConnectedAccountId: account.id });
        if (host && !host.isStripeOnboarded) {
          host.isStripeOnboarded = true;
          await host.save();
          console.log(`Host onboarding complete: ${host._id}`);
        }
      }
      break;
    }
  }

  res.json({ received: true });
};
