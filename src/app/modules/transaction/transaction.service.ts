import { Types } from "mongoose";
import stripe from "../../../config/stripe";
import ApiError from "../../../errors/ApiErrors";
import { BOOKING_STATUS } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { calculateExtendBookingAmount } from "../booking/booking.utils";
import { ICar } from "../car/car.interface";
import { validateAvailabilityStrict } from "../car/car.utils";
import { getDynamicCharges } from "../charges/charges.service";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "./transaction.interface";
import { Transaction } from "./transaction.model";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";

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
  userId: string,
) => {
  const booking = await Booking.findById(bookingId).populate("carId");

  if (!booking) throw new Error("Booking not found");

  // state validation
  if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
    throw new Error("Booking not payable");
  }

  //  ownership validation (MUST)
  if (!booking.userId.equals(userId)) {
    throw new Error("Unauthorized booking payment");
  }

  //  self booking block
  if (booking.isSelfBooking) {
    throw new Error("Self booking does not require payment");
  }

  //  cancelled check
  if (booking.isCanceledByUser || booking.isCanceledByHost) {
    throw new Error("Cancelled booking cannot be paid");
  }

  // availability check (strict)
  await validateAvailabilityStrict(
    (booking.carId as any)._id.toString(),
    booking.fromDate,
    booking.toDate,
  );

  //  car + deposit
  const car = booking.carId as any;
  if (!car) throw new Error("Car details not found");

  const totalAmount = booking.totalAmount;

  //  dynamic charges calculation
  const charges = await getDynamicCharges({
    totalAmount: booking.totalAmount,
  });

  //  create transaction
  const transaction = await Transaction.create({
    bookingId: booking._id,
    userId,
    hostId: booking.hostId,
    amount: totalAmount,
    type: TRANSACTION_TYPE.BOOKING,
    status: TRANSACTION_STATUS.INITIATED,
    charges: {
      platformFee: charges.platformFee,
      hostCommission: charges.hostCommission,
      adminCommission: charges.adminCommission,
    },
  });

  //  create Stripe session
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
          unit_amount: Math.round(totalAmount * 100),
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

const createExtendBookingPaymentSession = async (
  bookingId: string,
  userId: string,
  newToDate: Date,
) => {
  console.log(newToDate, "NEW TO DATE");
  if (!newToDate) {
    throw new ApiError(400, "New end date is required");
  }
  const booking = await Booking.findById(bookingId).populate("carId");
  if (!booking) throw new ApiError(404, "Booking not found");
  if (!booking.userId.equals(userId)) throw new ApiError(403, "Unauthorized");

  if (
    ![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ONGOING].includes(
      booking.bookingStatus,
    )
  ) {
    throw new ApiError(400, "Only active bookings can be extended");
  }

  if (newToDate <= booking.toDate) {
    throw new ApiError(
      400,
      "New end date must be after current booking end date",
    );
  }

  // availability check
  await validateAvailabilityStrict(
    (booking.carId as any)._id.toString(),
    booking.toDate,
    newToDate,
  );

  // calculate extended amount
  const car = booking.carId as any;
  const extendedAmount = calculateExtendBookingAmount(
    booking.toDate,
    newToDate,
    car,
  );

  console.log(extendedAmount, "EXTENDED AMOUNT");

  // create transaction
  const transaction = await Transaction.create({
    bookingId: booking._id,
    userId,
    hostId: booking.hostId,
    amount: extendedAmount,
    type: TRANSACTION_TYPE.EXTEND,
    status: TRANSACTION_STATUS.INITIATED,
    extendToDate: newToDate,
  });

  // create Stripe session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: process.env.CURRENCY!,
          product_data: { name: `Extend Booking ${booking.bookingId}` },
          unit_amount: Math.round(extendedAmount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      transactionId: transaction._id.toString(),
      bookingId: booking._id.toString(),
      originalBookingId: booking._id.toString(),
      extendToDate: newToDate.toISOString(),
    },
    success_url: `http://10.10.7.41:5005/extend-payment-success`,
    cancel_url: `http://10.10.7.41:5005/extend-payment-cancel`,
  });

  transaction.stripeSessionId = session.id;
  await transaction.save();

  console.log(session, "SESSIOn");

  return session.url;
};

const getTransactionsFromDB = async (userId: string, status?: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  // Step 1: Fetch user to get role
  const user = await User.findById(userId).select("role");
  if (!user) throw new Error("User not found");

  // Step 2: Get bookings depending on role
  const bookingFilter: any =
    user.role === USER_ROLES.USER
      ? { userId: new Types.ObjectId(userId) }
      : { hostId: new Types.ObjectId(userId) };

  const bookings = await Booking.find(bookingFilter).select("_id");

  if (!bookings.length) return [];

  const bookingIds = bookings.map((b) => b._id);

  // Step 3: Build transaction filter
  const transactionFilter: any = { bookingId: { $in: bookingIds } };

  if (status) {
    // If status is provided in query, use it
    transactionFilter.status = status;
  } else {
    // If no status provided, default to SUCCESS and REFUNDED
    transactionFilter.status = {
      $in: [TRANSACTION_STATUS.SUCCESS, TRANSACTION_STATUS.REFUNDED],
    };
  }

  // Step 4: Fetch transactions
  const transactions = await Transaction.find(transactionFilter)
    .populate({
      path: "userId",
    })
    .populate({
      path: "hostId",
    })
    .lean();

  return transactions;
};

export const TransactionServices = {
  createBookingPaymentSession,
  createExtendBookingPaymentSession,
  getTransactionsFromDB,
};
