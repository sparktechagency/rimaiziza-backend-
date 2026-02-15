import config from "../../../config";
import stripe from "../../../config/stripe";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { ICar } from "../car/car.interface";
import { getDynamicCharges } from "../charges/charges.service";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "./transaction.interface";
import { Transaction } from "./transaction.model";

// const refundBooking = async (bookingId: string) => {
//     const booking = await Booking.findById(bookingId);
//     if (!booking) return;

//     const transaction = await Transaction.findOne({ bookingId });
//     await stripe.refunds.create({ payment_intent: transaction!.stripePaymentIntentId! });

//     transaction!.status = TRANSACTION_STATUS.REFUNDED;
//     await transaction!.save();

//     booking.bookingStatus = BOOKING_STATUS.CANCELLED;
//     await booking.save();
// };


// akta missing ase, car theke deposite amount ta soho totalamount a calculate hobe, porobortite deposite amount ta ta k refund diye daoua hobe
const createBookingPaymentSession = async (bookingId: string, userId: string) => {
    const booking = await Booking.findById(bookingId).populate('carId');
    if (!booking) throw new Error("Booking not found");
    if (booking.bookingStatus !== 'PENDING') throw new Error("Booking not payable");

    // Include deposit in total amount
 
    const car = booking.carId as any;
    if (!car) throw new Error("Car details not found");

    const totalAmountWithDeposit = booking.totalAmount + (car.depositAmount || 0);
    console.log(totalAmountWithDeposit, "totalAmountWithDeposit")
    console.log(car, "car")
   

    // Calculate dynamic charges
    const charges = await getDynamicCharges({ totalAmount: booking.totalAmount });

    // Create transaction with initial status
    const transaction = await Transaction.create({
        bookingId: booking._id,
        userId,
        amount: totalAmountWithDeposit,
        type: TRANSACTION_TYPE.BOOKING,
        status: TRANSACTION_STATUS.INITIATED,
        charges: {
            platformFee: charges.platformFee,
            hostCommission: charges.hostCommission,
            adminCommission: charges.adminCommission,
        }
    });

    // Stripe checkout session
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: process.env.CURRENCY!,
                product_data: { name: `Booking ${booking._id}` },
                unit_amount: totalAmountWithDeposit * 100,
            },
            quantity: 1,
        }],
        metadata: { transactionId: transaction._id.toString(), bookingId: booking._id.toString() },
        success_url: `http://10.10.7.41:5005/payment-success`,
        cancel_url: `http://10.10.7.41:5005/payment-cancel`,
    });

    transaction.stripeSessionId = session.id;
    await transaction.save();

    console.log(session, "SESSION")

    return session.url;
};

export const TransactionServices = {
    // refundBooking,
    createBookingPaymentSession,
}
