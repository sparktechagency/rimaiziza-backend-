import config from "../../../config";
import stripe from "../../../config/stripe";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { ICar } from "../car/car.interface";
import { validateAvailabilityStrict } from "../car/car.utils";
import { getDynamicCharges } from "../charges/charges.service";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "./transaction.interface";
import { Transaction } from "./transaction.model";


// const createBookingPaymentSession = async (bookingId: string, userId: string) => {
//     const booking = await Booking.findById(bookingId).populate('carId');
//     if (!booking) throw new Error("Booking not found");
//     if (booking.bookingStatus !== BOOKING_STATUS.PENDING) throw new Error("Booking not payable");

//     // Include deposit in total amount
//     const car = booking.carId as any;
//     if (!car) throw new Error("Car details not found");

//     const totalAmountWithDeposit = booking.totalAmount + (car.depositAmount || 0);
//     console.log(totalAmountWithDeposit, "totalAmountWithDeposit")
//     console.log(car, "car")


//     // Calculate dynamic charges
//     const charges = await getDynamicCharges({ totalAmount: booking.totalAmount });

//     // Create transaction with initial status
//     const transaction = await Transaction.create({
//         bookingId: booking._id,
//         userId,
//         amount: totalAmountWithDeposit,
//         type: TRANSACTION_TYPE.BOOKING,
//         status: TRANSACTION_STATUS.INITIATED,
//         charges: {
//             platformFee: charges.platformFee,
//             hostCommission: charges.hostCommission,
//             adminCommission: charges.adminCommission,
//         }
//     });

//     // Stripe checkout session
//     const session = await stripe.checkout.sessions.create({
//         mode: 'payment',
//         payment_method_types: ['card'],
//         line_items: [{
//             price_data: {
//                 currency: process.env.CURRENCY!,
//                 product_data: { name: `Booking ${booking._id}` },
//                 unit_amount: totalAmountWithDeposit * 100,
//             },
//             quantity: 1,
//         }],
//         metadata: { transactionId: transaction._id.toString(), bookingId: booking._id.toString() },
//         success_url: `http://10.10.7.41:5005/payment-success`,
//         cancel_url: `http://10.10.7.41:5005/payment-cancel`,
//     });

//     transaction.stripeSessionId = session.id;
//     await transaction.save();

//     console.log(session, "SESSION")

//     return session.url;
// };



const createBookingPaymentSession = async (
    bookingId: string,
    userId: string
) => {
    const booking = await Booking.findById(bookingId).populate("carId");

    if (!booking) throw new Error("Booking not found");

    // State validation
    if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
        throw new Error("Booking not payable");
    }

    //  Ownership validation (MUST)
    if (!booking.userId.equals(userId)) {
        throw new Error("Unauthorized booking payment");
    }

    //  Self booking block
    if (booking.isSelfBooking) {
        throw new Error("Self booking does not require payment");
    }

    //  Cancelled check
    if (booking.isCanceledByUser || booking.isCanceledByHost) {
        throw new Error("Cancelled booking cannot be paid");
    }

    // Availability check (strict)
    await validateAvailabilityStrict(
        booking.carId.toString(),
        booking.fromDate,
        booking.toDate
    );

    //  Car + deposit
    const car = booking.carId as any;
    if (!car) throw new Error("Car details not found");

    const totalAmountWithDeposit =
        booking.totalAmount + (car.depositAmount || 0);

    //  Dynamic charges calculation
    const charges = await getDynamicCharges({
        totalAmount: booking.totalAmount,
    });

    //  Create transaction
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
        },
    });

    //  Create Stripe session
    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: process.env.CURRENCY!,
                    product_data: {
                        name: `Booking ${booking._id}`,
                    },
                    unit_amount: Math.round(totalAmountWithDeposit * 100),
                },
                quantity: 1,
            },
        ],
        metadata: {
            transactionId: transaction._id.toString(),
            bookingId: booking._id.toString(),
        },
        success_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
    });

    transaction.stripeSessionId = session.id;
    await transaction.save();

    return session.url;
};



export const TransactionServices = {
    createBookingPaymentSession,
}
