"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionServices = void 0;
const mongoose_1 = require("mongoose");
const stripe_1 = __importDefault(require("../../../config/stripe"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const booking_interface_1 = require("../booking/booking.interface");
const booking_model_1 = require("../booking/booking.model");
const booking_utils_1 = require("../booking/booking.utils");
const car_utils_1 = require("../car/car.utils");
const charges_service_1 = require("../charges/charges.service");
const transaction_interface_1 = require("./transaction.interface");
const transaction_model_1 = require("./transaction.model");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
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
const createBookingPaymentSession = (bookingId, userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const booking =
      yield booking_model_1.Booking.findById(bookingId).populate("carId");
    if (!booking) throw new Error("Booking not found");
    // state validation
    if (booking.bookingStatus !== booking_interface_1.BOOKING_STATUS.PENDING) {
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
    yield (0, car_utils_1.validateAvailabilityStrict)(
      booking.carId._id.toString(),
      booking.fromDate,
      booking.toDate,
    );
    //  car + deposit
    const car = booking.carId;
    if (!car) throw new Error("Car details not found");
    const totalAmount = booking.totalAmount;
    //  dynamic charges calculation
    const charges = yield (0, charges_service_1.getDynamicCharges)({
      totalAmount: booking.totalAmount,
    });
    //  create transaction
    const transaction = yield transaction_model_1.Transaction.create({
      bookingId: booking._id,
      userId,
      hostId: booking.hostId,
      amount: totalAmount,
      type: transaction_interface_1.TRANSACTION_TYPE.BOOKING,
      status: transaction_interface_1.TRANSACTION_STATUS.INITIATED,
      charges: {
        platformFee: charges.platformFee,
        hostCommission: charges.hostCommission,
        adminCommission: charges.adminCommission,
      },
    });
    //  create Stripe session
    const session = yield stripe_1.default.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY,
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
    yield transaction.save();
    return session.url;
  });
const createExtendBookingPaymentSession = (bookingId, userId, newToDate) =>
  __awaiter(void 0, void 0, void 0, function* () {
    console.log(newToDate, "NEW TO DATE");
    if (!newToDate) {
      throw new ApiErrors_1.default(400, "New end date is required");
    }
    const booking =
      yield booking_model_1.Booking.findById(bookingId).populate("carId");
    if (!booking) throw new ApiErrors_1.default(404, "Booking not found");
    if (!booking.userId.equals(userId))
      throw new ApiErrors_1.default(403, "Unauthorized");
    if (
      ![
        booking_interface_1.BOOKING_STATUS.CONFIRMED,
        booking_interface_1.BOOKING_STATUS.ONGOING,
      ].includes(booking.bookingStatus)
    ) {
      throw new ApiErrors_1.default(
        400,
        "Only active bookings can be extended",
      );
    }
    if (newToDate <= booking.toDate) {
      throw new ApiErrors_1.default(
        400,
        "New end date must be after current booking end date",
      );
    }
    // availability check
    yield (0, car_utils_1.validateAvailabilityStrict)(
      booking.carId._id.toString(),
      booking.toDate,
      newToDate,
    );
    // calculate extended amount
    const car = booking.carId;
    const extendedAmount = (0, booking_utils_1.calculateExtendBookingAmount)(
      booking.toDate,
      newToDate,
      car,
    );
    console.log(extendedAmount, "EXTENDED AMOUNT");
    // create transaction
    const transaction = yield transaction_model_1.Transaction.create({
      bookingId: booking._id,
      userId,
      hostId: booking.hostId,
      amount: extendedAmount,
      type: transaction_interface_1.TRANSACTION_TYPE.EXTEND,
      status: transaction_interface_1.TRANSACTION_STATUS.INITIATED,
      extendToDate: newToDate,
    });
    // create Stripe session
    const session = yield stripe_1.default.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY,
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
    yield transaction.save();
    console.log(session, "SESSIOn");
    return session.url;
  });
const getTransactionsFromDB = (userId, status) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }
    // Step 1: Fetch user to get role
    const user = yield user_model_1.User.findById(userId).select("role");
    if (!user) throw new Error("User not found");
    // Step 2: Get bookings depending on role
    const bookingFilter =
      user.role === user_1.USER_ROLES.USER
        ? { userId: new mongoose_1.Types.ObjectId(userId) }
        : { hostId: new mongoose_1.Types.ObjectId(userId) };
    const bookings =
      yield booking_model_1.Booking.find(bookingFilter).select("_id");
    if (!bookings.length) return [];
    const bookingIds = bookings.map((b) => b._id);
    // Step 3: Build transaction filter
    const transactionFilter = { bookingId: { $in: bookingIds } };
    if (status) {
      // If status is provided in query, use it
      transactionFilter.status = status;
    } else {
      // If no status provided, default to SUCCESS and REFUNDED
      transactionFilter.status = {
        $in: [
          transaction_interface_1.TRANSACTION_STATUS.SUCCESS,
          transaction_interface_1.TRANSACTION_STATUS.REFUNDED,
        ],
      };
    }
    // Step 4: Fetch transactions
    const transactions = yield transaction_model_1.Transaction.find(
      transactionFilter,
    )
      .populate({
        path: "userId",
      })
      .populate({
        path: "hostId",
      })
      .lean();
    return transactions;
  });
exports.TransactionServices = {
  createBookingPaymentSession,
  createExtendBookingPaymentSession,
  getTransactionsFromDB,
};
