import { Booking } from "./booking.model";
import { Car } from "../car/car.model";
import { BOOKING_STATUS, CAR_STATUS, Driver_STATUS } from "./booking.interface";
import { calculatePrice } from "../../../util/bookingCalculation";
import { getCarTripCountMap } from "../car/car.utils";
import mongoose, { Types } from "mongoose";
import { ReviewServices } from "../review/review.service";
import { REVIEW_TYPE } from "../review/review.interface";
import Transaction from "../payment/transaction.model";
import { calculateRefundPercentage } from "../../../util/refundCalculation";
import { PaymentService } from "../payment/payment.service";
import QueryBuilder from "../../builder/queryBuilder";
 
// -------- Create Booking ----------
const createBooking = async (body: any, userId: string) => {
  console.log(body);
  const { carId, fromDate, toDate, type } = body;
  const car = await Car.findById(carId);
  if (!car) throw new Error("Car not found");
  const dayHour = calculatePrice(fromDate, toDate);
  const dailyPrice = car.dailyPrice ?? 0;
  const hourlyPrice = car.hourlyPrice ?? 0;
  const totalAmount = dayHour.days * dailyPrice + dayHour.hours * hourlyPrice;
 
  const booking = await Booking.create({
    carId,
    userId,
    hostId: car.userId,
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    totalAmount,
    status: BOOKING_STATUS.PENDING,
    type: type || Driver_STATUS.WITHOUTDRIVER,
  });
  console.log(booking);
 
  return booking;
};
 
 
// -------- Get user bookings ----------
 
// const getUserBookings = async (userId: string, status?: string) => {
//   const filter: any = { userId };
 
//   if (status) filter.carStatus = status;
 
//   return Booking.find(filter)
//     .populate("carId")
//     .populate("hostId")
//     .populate("transactionId")
//     .sort({ createdAt: -1 });
// };
 
// =======================MOSHFIQUR RAHMAN====================
const getUserBookings = async (userId: string, status?: string) => {
  const filter: any = { userId };
 
  if (status) filter.carStatus = status;
 
  // ---------- STEP 1: Fetch bookings ----------
  const bookings = await Booking.find(filter)
    .populate("carId")
    .populate("hostId")
    .populate("transactionId")
    .sort({ createdAt: -1 })
    .lean();
 
  if (!bookings.length) return bookings;
 
  // ---------- STEP 2: Extract carIds ----------
  const carIds = bookings
    .map((booking: any) => booking.carId?._id)
    .filter(Boolean)
    .map((id: any) => new Types.ObjectId(id));
 
  // ---------- STEP 3: Trip count ----------
  const tripCountMap = await getCarTripCountMap(carIds);
 
  // ---------- STEP 4: Attach trips + rating ----------
  const finalBookings = await Promise.all(
    bookings.map(async (booking: any) => {
      const carId = booking.carId?._id?.toString();
 
      const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
        carId,
        REVIEW_TYPE.CAR
      );
 
      return {
        ...booking,
        carId: {
          ...booking.carId,
          trips: tripCountMap[carId] || 0,
          averageRating: reviewSummary.averageRating,
          totalReviews: reviewSummary.totalReviews,
          starCounts: reviewSummary.starCounts,
          reviews: reviewSummary.reviews,
        },
      };
    })
  );
 
  return finalBookings;
};
 
// =======================MOSHFIQUR RAHMAN====================
 
// -------- Get host bookings ----------
// const getHostBookings = async (hostId: string, status?: string) => {
//   const filter: any = { hostId };
 
//   if (status) filter.carStatus = status;
//   return Booking.find(filter)
//     .populate("carId")
//     .populate("userId")
//     .populate("transactionId")
//     .sort({ createdAt: -1 });
// };
 
// =======================MOSHFIQUR RAHMAN====================
const getHostBookings = async (hostId: string, status?: string) => {
  const filter: any = { hostId };
 
  if (status) filter.carStatus = status;
 
  // ---------- STEP 1: Fetch bookings ----------
  const bookings = await Booking.find(filter)
    .populate("carId")
    .populate("userId")
    .populate("transactionId")
    .sort({ createdAt: -1 })
    .lean();
 
  if (!bookings.length) return bookings;
 
  // ---------- STEP 2: Extract carIds ----------
  const carIds = bookings
    .map((booking: any) => booking.carId?._id)
    .filter(Boolean)
    .map((id: any) => new Types.ObjectId(id));
 
  // ---------- STEP 3: Trip count ----------
  const tripCountMap = await getCarTripCountMap(carIds);
 
  // ---------- STEP 4: Attach trips + rating ----------
  const finalBookings = await Promise.all(
    bookings.map(async (booking: any) => {
      const carId = booking.carId?._id?.toString();
 
      const reviewSummary = await ReviewServices.getReviewSummaryFromDB(
        carId,
        REVIEW_TYPE.CAR
      );
 
      return {
        ...booking,
        carId: {
          ...booking.carId,
          trips: tripCountMap[carId] || 0,
          averageRating: reviewSummary.averageRating,
          totalReviews: reviewSummary.totalReviews,
          starCounts: reviewSummary.starCounts,
          reviews: reviewSummary.reviews,
        },
      };
    })
  );
 
  return finalBookings;
};
// =======================MOSHFIQUR RAHMAN====================
 
const checkIn = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");
 
  if (booking.status !== BOOKING_STATUS.PAID)
    throw new Error("Payment required");
 
  if (booking.checkIn) throw new Error("Already checked in");
 
  booking.checkIn = true;
  if (
    booking.status === BOOKING_STATUS.PAID &&
    booking.checkIn &&
    !booking.checkOut
  ) {
    booking.carStatus = CAR_STATUS.ONGOING;
  }
  return booking.save();
};
 
const checkOut = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");
 
  if (!booking.checkIn) throw new Error("Cannot check-out before check-in");
  if (booking.checkOut) throw new Error("Already checked out");
 
  booking.checkOut = true;
  if (
    booking.status === BOOKING_STATUS.PAID &&
    booking.checkIn &&
    booking.checkOut
  ) {
    booking.carStatus = CAR_STATUS.COMPLETED;
  }
  booking.checkedOutAt = new Date();
  return booking.save();
};
 
// const isCancelled = async (bookingId: string) => {
//   const booking = await Booking.findById(bookingId);
//   if (!booking) throw new Error("Booking not found");
 
//   if (booking.isCancelled)
//     throw new Error("Booking already cancelled");
 
//   if (booking.checkIn)
//     throw new Error("Cannot cancel after check-in");
 
//   // ---------- PAID BOOKING → REFUND ----------
//   if (booking.status === BOOKING_STATUS.PAID) {
//     if (booking.payoutProcessed)
//       throw new Error("Refund not allowed after host payout");
 
//     const transaction = await Transaction.findById(booking.transactionId);
//     if (!transaction)
//       throw new Error("Transaction not found");
 
//     const refundPercentage = calculateRefundPercentage(booking.fromDate);
//     if (refundPercentage === 0)
//       throw new Error("Refund not applicable");
 
//     await PaymentService.refundBookingPayment(
//       booking,
//       transaction,
//       refundPercentage
//     );
//   }
 
//   // ---------- CANCEL BOOKING (ONLY ONCE) ----------
//   booking.isCancelled = true;
//   booking.status = BOOKING_STATUS.CANCELLED;
//   booking.carStatus = CAR_STATUS.CANCELLED;
 
//   await booking.save();
 
//   return booking;
// };
 
const isCancelled = async (bookingId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
 
  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw new Error("Booking not found");
 
    if (booking.isCancelled) throw new Error("Booking already cancelled");
 
    if (booking.checkIn) throw new Error("Cannot cancel after check-in");
 
    if (booking.status === BOOKING_STATUS.PAID) {
      if (booking.payoutProcessed)
        throw new Error("Refund not allowed after host payout");
 
      const transaction = await Transaction.findById(
        booking.transactionId
      ).session(session);
 
      if (!transaction) throw new Error("Transaction not found");
 
      const refundPercentage = calculateRefundPercentage(booking.fromDate);
      if (refundPercentage === 0) throw new Error("Refund not applicable");
 
      // Stripe call
      await PaymentService.refundBookingPayment(
        booking,
        transaction,
        refundPercentage,
        session
      );
    }
 
    booking.isCancelled = true;
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.carStatus = CAR_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
 
    await booking.save({ session });
 
    await session.commitTransaction();
    session.endSession();
 
    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
 
//  ==========Admin: Get all bookings ==========
const getAllBookingsForAdmin = async (query: Record<string, any>) => {
  const baseQuery = Booking.find()
    .populate("carId")
    .populate("userId")
    .populate("hostId")
    .populate("transactionId");
 
  const qb = new QueryBuilder(baseQuery, query);
 
  qb
    // 🔍 ONLY string / enum fields
    .search(["status", "carStatus", "type"])
    //exact filters
    .filter()
    .sort()
    .paginate()
    .fields();
 
  const data = await qb.modelQuery;
  const meta = await qb.countTotal();
 
  return { data, meta };
};
 
 
// ============Get booking by ID ============
const getBookingById = async (bookingId: string) => {
  const booking = await Booking.findById(bookingId)
    .populate("carId")
    .populate("userId")
    .populate("hostId")
    .populate("transactionId");
 
  if (!booking) throw new Error("Booking not found");
 
  return booking;
};
 
// ===========Update booking by ID ===========
 
const updateBookingByAdmin = async (
  bookingId: string,
  payload: Partial<any>
) => {
  if (!Types.ObjectId.isValid(bookingId))
    throw new Error("Invalid booking id");
 
  const booking = await Booking.findByIdAndUpdate(
    bookingId,
    payload,
    { new: true }
  )
    .populate("carId")
    .populate("userId")
    .populate("hostId")
    .populate("transactionId");
 
  if (!booking) throw new Error("Booking not found");
 
  return booking;
};
 
// ==========Delete booking by ID ===========
 
const deleteBookingByAdmin = async (bookingId: string) => {
  if (!Types.ObjectId.isValid(bookingId))
    throw new Error("Invalid booking id");
 
  const booking = await Booking.findByIdAndDelete(bookingId);
  if (!booking) throw new Error("Booking not found");
 
  return booking;
};
 
 
// ========== Get booking status stats for chart ==========
 
 
const getBookingStatusStats = async (year?: number) => {
  // Default to current year if not provided
  const targetYear = year ?? new Date().getFullYear();
 
  const start = new Date(targetYear, 0, 1);        // January 1, targetYear
  const end = new Date(targetYear + 1, 0, 1);      // January 1, next year
 
 const stats = await Booking.aggregate([
  {
    $addFields: {
      analyticsDate: {
        $switch: {
          branches: [
            // Cancelled → cancelledAt
            {
              case: { $eq: ["$carStatus", CAR_STATUS.CANCELLED] },
              then: "$cancelledAt",
            },
 
            // Completed → checkOut / toDate
            {
              case: { $eq: ["$carStatus", CAR_STATUS.COMPLETED] },
              then: "$checkedOutAt",
            },
 
            // Upcoming / Active → fromDate
            {
              case: {
                $in: ["$carStatus", [CAR_STATUS.UPCOMING, CAR_STATUS.ONGOING]],
              },
              then: "$fromDate",
            },
          ],
          default: "$fromDate",
        },
      },
    },
  },
 
  // Now filter by correct analytics date
  {
    $match: {
      analyticsDate: { $gte: start, $lt: end },
    },
  },
 
  {
    $addFields: {
      chartStatus: {
        $switch: {
          branches: [
            { case: { $eq: ["$carStatus", CAR_STATUS.COMPLETED] }, then: "Completed" },
            { case: { $eq: ["$carStatus", CAR_STATUS.ONGOING] }, then: "Active" },
            { case: { $eq: ["$carStatus", CAR_STATUS.CANCELLED] }, then: "Cancelled" },
            {
              case: {
                $and: [
                  { $eq: ["$status", BOOKING_STATUS.PAID] },
                  { $eq: ["$checkIn", false] },
                ],
              },
              then: "Upcoming",
            },
          ],
          default: "Other",
        },
      },
    },
  },
 
  {
    $group: {
      _id: "$chartStatus",
      count: { $sum: 1 },
    },
  },
]);
 
 
  const total = stats.reduce((sum, item) => sum + item.count, 0) || 1; // avoid divide by zero
 
  const result: Record<string, string> = {};
  stats.forEach((item) => {
    if (item._id !== "Other") {
      const percentage = Math.round((item.count / total) * 100);
      result[item._id] = percentage + "%";
    }
  });
 
  // Always return all 4 categories (even if 0%)
  const categories = ["Completed", "Upcoming", "Active", "Cancelled"];
  categories.forEach((cat) => {
    if (!result[cat]) result[cat] = "0%";
  });
 
  return {
    year: targetYear,
    stats: result,
  };
};
 
 
// -------- Export as object ----------
export const BookingService = {
  createBooking,
  getUserBookings,
  getHostBookings,
  checkIn,
  checkOut,
  isCancelled,
  getAllBookingsForAdmin,
  getBookingById,
  updateBookingByAdmin,
  deleteBookingByAdmin,
  getBookingStatusStats,
};
 