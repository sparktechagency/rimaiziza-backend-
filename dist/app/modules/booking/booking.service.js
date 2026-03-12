"use strict";
// import { Types } from "mongoose";
// import ApiError from "../../../errors/ApiErrors";
// import stripe from "../../../config/stripe";
// import { generateBookingId } from "../../../helpers/generateYearBasedId";
// import { USER_ROLES } from "../../../enums/user";
// import { Car } from "../car/car.model";
// import { validateAvailabilityStrict } from "../car/car.utils";
// import { TRANSACTION_STATUS } from "../transaction/transaction.interface";
// import { Transaction } from "../transaction/transaction.model";
// import { BOOKING_STATUS } from "./booking.interface";
// import { Booking } from "./booking.model";
// import {
//   calculateFirstTimeBookingAmount,
//   validateAvailabilityStrictForApproval,
// } from "./booking.utils";
// import { sendNotifications } from "../../../helpers/notificationsHelper";
// import { NOTIFICATION_TYPE } from "../notification/notification.constant";
// import { User } from "../user/user.model";
// import { ReviewServices } from "../review/review.service";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingServices = void 0;
// const createBookingToDB = async (payload: any, userId: string) => {
//   await validateAvailabilityStrict(
//     payload.carId,
//     payload.fromDate,
//     payload.toDate,
//   );
//   payload.userId = userId;
//   const bookingId = await generateBookingId();
//   payload.bookingId = bookingId;
//   const car = await Car.findById(payload.carId);
//   if (!car) throw new ApiError(404, "Car not found");
//   const isSelfBooking = car?.assignedHosts?.toString() === userId;
//   const bookingStatus = isSelfBooking
//     ? BOOKING_STATUS.CONFIRMED
//     : BOOKING_STATUS.REQUESTED;
//   const calculation = await calculateFirstTimeBookingAmount(
//     new Date(payload.fromDate),
//     new Date(payload.toDate),
//     car,
//   );
//   const result = await Booking.create({
//     ...payload,
//     hostId: car.assignedHosts,
//     bookingStatus,
//     rentalPrice: calculation.baseRentalPrice,
//     platformFee: calculation.platformFee,
//     hostCommission: calculation.hostCommission,
//     adminCommission: calculation.adminCommission,
//     totalAmount: calculation.totalAmount,
//     isSelfBooking,
//     requestedAt: new Date(),
//     ...(isSelfBooking && {
//       approvedAt: new Date(),
//       confirmedAt: new Date(),
//     }),
//   });
//   const notificationText = `Booking ${result.bookingId} status is ${result.bookingStatus}`;
//   // 1️⃣ Collect receivers
//   const receivers = [
//     {
//       receiver: result.userId.toString(),
//       type: NOTIFICATION_TYPE.USER,
//     },
//     {
//       receiver: result.hostId.toString(),
//       type: NOTIFICATION_TYPE.HOST,
//     },
//   ];
//   // 2️⃣ Add admin if exists
//   const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
//     "_id",
//   );
//   if (admin) {
//     receivers.push({
//       receiver: admin._id.toString(),
//       type: NOTIFICATION_TYPE.ADMIN,
//     });
//   }
//   // 3️⃣ Deduplicate by receiver
//   const uniqueReceivers = new Map<string, (typeof receivers)[0]>();
//   for (const r of receivers) {
//     if (!uniqueReceivers.has(r.receiver)) {
//       uniqueReceivers.set(r.receiver, r);
//     }
//   }
//   // 4️⃣ Send notifications
//   await Promise.all(
//     Array.from(uniqueReceivers.values()).map((r) =>
//       sendNotifications({
//         text: notificationText,
//         receiver: r.receiver,
//         type: r.type,
//         referenceId: result._id.toString(),
//       }),
//     ),
//   );
//   return result;
// };
// const getHostBookingsFromDB = async (hostId: string, query: any) => {
//   if (!Types.ObjectId.isValid(hostId)) {
//     throw new ApiError(400, "Invalid host id");
//   }
//   const { status, page = 1, limit = 20 } = query;
//   const filter: any = {
//     hostId: new Types.ObjectId(hostId),
//   };
//   // ---------- Status Filter ----------
//   if (status) {
//     const statuses = status
//       .split(",")
//       .map((s: any) => s.trim().toUpperCase())
//       .filter((s: any) =>
//         Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS),
//       );
//     if (!statuses.length) {
//       throw new ApiError(400, "Invalid booking status filter");
//     }
//     filter.bookingStatus = { $in: statuses };
//   }
//   const skip = (Number(page) - 1) * Number(limit);
//   const [data, total] = await Promise.all([
//     Booking.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .populate("carId")
//       .populate("userId")
//       .populate("hostId")
//       .lean(),
//     Booking.countDocuments(filter),
//   ]);
//   const targetIds = data
//     .map((b: any) => b.userId?._id?.toString())
//     .filter(Boolean);
//   const reviewedSet = await ReviewServices.getBulkReviewStatus(
//     hostId,
//     targetIds,
//   );
//   const dataWithReviewStatus = data.map((b: any) => ({
//     ...b,
//     isReviewed: reviewedSet.has(b.userId?._id?.toString()),
//   }));
//   return {
//     meta: {
//       page: Number(page),
//       limit: Number(limit),
//       total,
//       totalPage: Math.ceil(total / Number(limit)),
//     },
//     data: dataWithReviewStatus,
//   };
// };
// const getUserBookingsFromDB = async (userId: string, query: any) => {
//   if (!Types.ObjectId.isValid(userId)) {
//     throw new ApiError(400, "Invalid user id");
//   }
//   const { status, page = 1, limit = 20 } = query;
//   const filter: any = {
//     userId: new Types.ObjectId(userId),
//   };
//   // ---------- Status Filter ----------
//   if (status) {
//     const statuses = status
//       .split(",")
//       .map((s: string) => s.trim().toUpperCase())
//       .filter((s: string) =>
//         Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS),
//       );
//     if (!statuses.length) {
//       throw new ApiError(400, "Invalid booking status filter");
//     }
//     filter.bookingStatus = { $in: statuses };
//   }
//   const skip = (Number(page) - 1) * Number(limit);
//   const [data, total] = await Promise.all([
//     Booking.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .populate("carId")
//       .populate("hostId")
//       .lean(),
//     Booking.countDocuments(filter),
//   ]);
//   const targetIds = data
//     .map((b: any) => b.hostId?._id?.toString())
//     .filter(Boolean);
//   const reviewedSet = await ReviewServices.getBulkReviewStatus(
//     userId,
//     targetIds,
//   );
//   const dataWithReviewStatus = data.map((b: any) => ({
//     ...b,
//     isReviewed: reviewedSet.has(b.hostId?._id?.toString()),
//   }));
//   return {
//     meta: {
//       page: Number(page),
//       limit: Number(limit),
//       total,
//       totalPage: Math.ceil(total / Number(limit)),
//     },
//     data: dataWithReviewStatus,
//   };
// };
// const getHostBookingByIdFromDB = async (bookingId: string, hostId: string) => {
//   if (!Types.ObjectId.isValid(bookingId)) {
//     throw new ApiError(400, "Invalid booking id");
//   }
//   if (!Types.ObjectId.isValid(hostId)) {
//     throw new ApiError(400, "Invalid host id");
//   }
//   const booking = await Booking.findOne({
//     _id: new Types.ObjectId(bookingId),
//     hostId: new Types.ObjectId(hostId),
//   })
//     .populate("carId")
//     .populate("userId")
//     .populate("hostId")
//     .lean();
//   console.log(booking, "Booking");
//   if (!booking) {
//     throw new ApiError(404, "Booking not found");
//   }
//   const isReviewed = await ReviewServices.checkIfAlreadyReviewed(
//     hostId,
//     (booking.userId as any)._id.toString(),
//   );
//   return { ...booking, isReviewed };
// };
// const getUserBookingByIdFromDB = async (bookingId: string, userId: string) => {
//   if (!Types.ObjectId.isValid(bookingId)) {
//     throw new ApiError(400, "Invalid booking id");
//   }
//   if (!Types.ObjectId.isValid(userId)) {
//     throw new ApiError(400, "Invalid user id");
//   }
//   const booking = await Booking.findOne({
//     _id: new Types.ObjectId(bookingId),
//     userId: new Types.ObjectId(userId),
//   })
//     .populate("carId")
//     .populate("hostId")
//     .lean();
//   if (!booking) {
//     throw new ApiError(404, "Booking not found");
//   }
//   const isReviewed = await ReviewServices.checkIfAlreadyReviewed(
//     userId,
//     (booking.hostId as any)._id.toString(),
//   );
//   return { ...booking, isReviewed };
// };
// const approveBookingByHostFromDB = async (
//   bookingId: string,
//   hostId: string,
// ) => {
//   const booking = await Booking.findById(bookingId);
//   console.log(bookingId, "BookingId");
//   if (!booking) throw new ApiError(404, "Booking not found");
//   if (!booking.hostId.equals(hostId)) {
//     throw new ApiError(403, "Unauthorized");
//   }
//   if (booking.bookingStatus !== BOOKING_STATUS.REQUESTED) {
//     throw new ApiError(400, "Invalid booking state");
//   }
//   /**
//    * 🔒 STRICT re-validation before approve
//    * Ignore current booking itself
//    */
//   await validateAvailabilityStrictForApproval(
//     booking.carId.toString(),
//     booking.fromDate,
//     booking.toDate,
//     booking._id.toString(),
//   );
//   booking.bookingStatus = BOOKING_STATUS.PENDING;
//   booking.approvedAt = new Date();
//   await booking.save();
//   //  Send notification to the user, host, and admin
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.userId.toString(),
//     type: NOTIFICATION_TYPE.USER,
//     referenceId: booking._id.toString(),
//   });
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.hostId.toString(),
//     type: NOTIFICATION_TYPE.HOST,
//     referenceId: booking._id.toString(),
//   });
//   const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
//     "_id",
//   );
//   if (admin) {
//     await sendNotifications({
//       text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//       receiver: admin._id.toString(),
//       type: NOTIFICATION_TYPE.ADMIN,
//       referenceId: booking._id.toString(),
//     });
//   }
//   return booking;
// };
// const cancelBookingFromDB = async (
//   bookingId: string,
//   actorId: string,
//   actorRole: USER_ROLES,
// ) => {
//   if (!Types.ObjectId.isValid(bookingId)) {
//     throw new ApiError(400, "Invalid booking id");
//   }
//   const booking = await Booking.findById(bookingId)
//     .populate("carId")
//     .populate("transactionId");
//   if (!booking) {
//     throw new ApiError(404, "Booking not found");
//   }
//   if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
//     throw new ApiError(400, "Booking already cancelled");
//   }
//   if (booking.bookingStatus === BOOKING_STATUS.COMPLETED) {
//     throw new ApiError(400, "Completed booking cannot be cancelled");
//   }
//   const isUserActor = actorRole === USER_ROLES.USER;
//   const isHostActor = actorRole === USER_ROLES.HOST;
//   const isAdminActor =
//     actorRole === USER_ROLES.ADMIN || actorRole === USER_ROLES.SUPER_ADMIN;
//   // Role-based permission check
//   if (isUserActor) {
//     if (!booking.userId.equals(actorId)) {
//       throw new ApiError(403, "You are not allowed to cancel this booking");
//     }
//     if (booking.isSelfBooking) {
//       throw new ApiError(403, "Self bookings cannot be cancelled by customer");
//     }
//   } else if (isHostActor) {
//     if (!booking.hostId.equals(actorId) || !booking.isSelfBooking) {
//       throw new ApiError(403, "Hosts can cancel only their own self bookings");
//     }
//   } else if (!isAdminActor) {
//     throw new ApiError(403, "You are not allowed to cancel this booking");
//   }
//   const now = new Date();
//   const transaction = booking.transactionId
//     ? await Transaction.findById(booking.transactionId)
//     : null;
//   if (
//     transaction &&
//     transaction.status === TRANSACTION_STATUS.SUCCESS &&
//     transaction.stripePaymentIntentId
//   ) {
//     const car = booking.carId as any;
//     if (!car) throw new ApiError(400, "Car details not found");
//     const fromDate = new Date(booking.fromDate);
//     const toDate = new Date(booking.toDate);
//     const totalDays =
//       Math.ceil(
//         (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
//       ) || 1;
//     const paidAmount = transaction.amount;
//     const rentalPrice = (booking as any).rentalPrice;
//     const platformFee = (booking as any).platformFee;
//     const totalRental = rentalPrice + platformFee;
//     const diffMs = fromDate.getTime() - now.getTime();
//     const diffHours = diffMs / (1000 * 60 * 60);
//     let chargeAmount = 0;
//     // Cancellation after pickup
//     if (now >= fromDate) {
//       // Multi-day prorated charge
//       const daysUsed = Math.min(
//         Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
//         totalDays,
//       );
//       // Charge for portion of rental price and platform fee used
//       chargeAmount = (daysUsed / totalDays) * totalRental;
//     }
//     // Cancellation < 72 hours before pickup
//     else if (diffHours < 72) {
//       // Charge 1 day's worth of total rental price
//       chargeAmount = totalRental / totalDays;
//     }
//     if (chargeAmount < 0) chargeAmount = 0;
//     if (chargeAmount > totalRental) chargeAmount = totalRental; // Should not exceed total rental
//     const refundAmount = paidAmount - chargeAmount;
//     if (refundAmount > 0 && transaction?.stripePaymentIntentId) {
//       await stripe.refunds.create({
//         payment_intent: transaction.stripePaymentIntentId as string,
//         amount: Math.round(refundAmount * 100),
//       });
//       transaction.status = TRANSACTION_STATUS.REFUNDED;
//       await transaction.save();
//       // Send refund notification to user and admin
//       await sendNotifications({
//         text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
//         receiver: booking.userId.toString(),
//         type: NOTIFICATION_TYPE.USER,
//         referenceId: booking._id.toString(),
//       });
//       const admin = await User.findOne({
//         role: USER_ROLES.SUPER_ADMIN,
//       }).select("_id");
//       if (admin) {
//         await sendNotifications({
//           text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
//           receiver: admin._id.toString(),
//           type: NOTIFICATION_TYPE.ADMIN,
//           referenceId: booking._id.toString(),
//         });
//       }
//     }
//   }
//   if (isUserActor) booking.isCanceledByUser = true;
//   if (isHostActor) booking.isCanceledByHost = true;
//   booking.bookingStatus = BOOKING_STATUS.CANCELLED;
//   booking.cancelledAt = new Date();
//   await booking.save();
//   // Update vehicle availability
//   if (booking.carId) {
//     await Car.findByIdAndUpdate(booking.carId._id, { isAvailable: true });
//   }
//   // Send notification to the user, host, and admin
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.userId.toString(),
//     type: NOTIFICATION_TYPE.USER,
//     referenceId: booking._id.toString(),
//   });
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.hostId.toString(),
//     type: NOTIFICATION_TYPE.HOST,
//     referenceId: booking._id.toString(),
//   });
//   const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
//     "_id",
//   );
//   if (admin) {
//     await sendNotifications({
//       text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//       receiver: admin._id.toString(),
//       type: NOTIFICATION_TYPE.ADMIN,
//       referenceId: booking._id.toString(),
//     });
//   }
//   return booking;
// };
// const getAllBookingsFromDB = async (query: any) => {
//   const searchTerm = query.search?.toLowerCase() || "";
//   const page = parseInt(query.page || "1", 10);
//   const limit = parseInt(query.limit || "10", 10);
//   const skip = (page - 1) * limit;
//   const aggregationPipeline: any[] = [
//     // Lookup car
//     {
//       $lookup: {
//         from: "cars",
//         localField: "carId",
//         foreignField: "_id",
//         as: "car",
//       },
//     },
//     { $unwind: { path: "$car", preserveNullAndEmptyArrays: true } },
//     // Lookup host
//     {
//       $lookup: {
//         from: "users",
//         localField: "hostId",
//         foreignField: "_id",
//         as: "host",
//       },
//     },
//     { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
//     // Lookup user
//     {
//       $lookup: {
//         from: "users",
//         localField: "userId",
//         foreignField: "_id",
//         as: "user",
//       },
//     },
//     { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
//   ];
//   // Search filter
//   if (searchTerm) {
//     aggregationPipeline.push({
//       $match: {
//         $or: [
//           { bookingId: { $regex: searchTerm, $options: "i" } },
//           { "car.model": { $regex: searchTerm, $options: "i" } },
//           { "car.vehicleId": { $regex: searchTerm, $options: "i" } },
//           { "car.brand": { $regex: searchTerm, $options: "i" } },
//           { "host.name": { $regex: searchTerm, $options: "i" } },
//           { "host.email": { $regex: searchTerm, $options: "i" } },
//           { "user.name": { $regex: searchTerm, $options: "i" } },
//           { "user.email": { $regex: searchTerm, $options: "i" } },
//         ],
//       },
//     });
//   }
//   // Booking status filter
//   if (
//     query.bookingStatus &&
//     Object.values(BOOKING_STATUS).includes(query.bookingStatus)
//   ) {
//     aggregationPipeline.push({
//       $match: {
//         bookingStatus: query.bookingStatus,
//       },
//     });
//   }
//   // Count total before pagination
//   const totalMeta = await Booking.aggregate([
//     ...aggregationPipeline,
//     { $count: "total" },
//   ]);
//   const total = totalMeta[0]?.total || 0;
//   // Apply sort if provided
//   if (query.sortBy && query.sortOrder) {
//     const sortOrder = query.sortOrder.toLowerCase() === "desc" ? -1 : 1;
//     aggregationPipeline.push({ $sort: { [query.sortBy]: sortOrder } });
//   } else {
//     aggregationPipeline.push({ $sort: { createdAt: -1 } });
//   }
//   // Pagination
//   aggregationPipeline.push({ $skip: skip }, { $limit: limit });
//   const bookings = await Booking.aggregate(aggregationPipeline);
//   return {
//     meta: {
//       total,
//       page,
//       limit,
//       totalPages: Math.ceil(total / limit),
//     },
//     bookings,
//   };
// };
// const getSelfBookingsByHost = async (
//   hostId: string,
//   status?: BOOKING_STATUS,
// ) => {
//   if (!hostId || !Types.ObjectId.isValid(hostId)) {
//     throw new ApiError(400, "Invalid hostId");
//   }
//   const filter: any = {
//     hostId: new Types.ObjectId(hostId),
//     isSelfBooking: true,
//   };
//   if (status) filter.bookingStatus = status;
//   const bookings = await Booking.find(filter)
//     .populate("carId")
//     .sort({ fromDate: -1 }) // latest first
//     .lean();
//   return bookings;
// };
// export const BookingServices = {
//   createBookingToDB,
//   getHostBookingsFromDB,
//   getUserBookingsFromDB,
//   getHostBookingByIdFromDB,
//   getUserBookingByIdFromDB,
//   approveBookingByHostFromDB,
//   cancelBookingFromDB,
//   // confirmBookingAfterPaymentFromDB,
//   getAllBookingsFromDB,
//   getSelfBookingsByHost,
// };
// START New Code : Removed Expiry & Overlapping Logic for REQUESTED bookings
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const stripe_1 = __importDefault(require("../../../config/stripe"));
const generateYearBasedId_1 = require("../../../helpers/generateYearBasedId");
const user_1 = require("../../../enums/user");
const car_model_1 = require("../car/car.model");
const car_utils_1 = require("../car/car.utils");
const transaction_interface_1 = require("../transaction/transaction.interface");
const transaction_model_1 = require("../transaction/transaction.model");
const booking_interface_1 = require("./booking.interface");
const booking_model_1 = require("./booking.model");
const booking_utils_1 = require("./booking.utils");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const user_model_1 = require("../user/user.model");
const review_service_1 = require("../review/review.service");
const createBookingToDB = (payload, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const from = new Date(payload.fromDate);
    const to = new Date(payload.toDate);
    // Minimum 24 hours (1 day) validation
    const diffMs = to.getTime() - from.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
        throw new ApiErrors_1.default(400, "Minimum booking duration must be 24 hours (1 day)");
    }
    yield (0, car_utils_1.validateAvailabilityStrict)(payload.carId, payload.fromDate, payload.toDate);
    payload.userId = userId;
    const bookingId = yield (0, generateYearBasedId_1.generateBookingId)();
    payload.bookingId = bookingId;
    const car = yield car_model_1.Car.findById(payload.carId);
    if (!car)
        throw new ApiErrors_1.default(404, "Car not found");
    const isSelfBooking = ((_a = car === null || car === void 0 ? void 0 : car.assignedHosts) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    const bookingStatus = isSelfBooking
        ? booking_interface_1.BOOKING_STATUS.CONFIRMED
        : booking_interface_1.BOOKING_STATUS.REQUESTED;
    const calculation = yield (0, booking_utils_1.calculateFirstTimeBookingAmount)(new Date(payload.fromDate), new Date(payload.toDate), car);
    const result = yield booking_model_1.Booking.create(Object.assign(Object.assign(Object.assign({}, payload), { hostId: car.assignedHosts, bookingStatus, rentalPrice: calculation.baseRentalPrice, platformFee: calculation.platformFee, hostCommission: calculation.hostCommission, adminCommission: calculation.adminCommission, totalAmount: calculation.totalAmount, isSelfBooking, requestedAt: new Date() }), (isSelfBooking && {
        approvedAt: new Date(),
        confirmedAt: new Date(),
    })));
    const notificationText = `Booking ${result.bookingId} status is ${result.bookingStatus}`;
    // 1️⃣ Collect receivers
    const receivers = [
        {
            receiver: result.userId.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
        },
        {
            receiver: result.hostId.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.HOST,
        },
    ];
    // 2️⃣ Add admin if exists
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id");
    if (admin) {
        receivers.push({
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
        });
    }
    // 3️⃣ Deduplicate by receiver
    const uniqueReceivers = new Map();
    for (const r of receivers) {
        if (!uniqueReceivers.has(r.receiver)) {
            uniqueReceivers.set(r.receiver, r);
        }
    }
    // 4️⃣ Send notifications
    yield Promise.all(Array.from(uniqueReceivers.values()).map((r) => (0, notificationsHelper_1.sendNotifications)({
        text: notificationText,
        receiver: r.receiver,
        type: r.type,
        referenceId: result._id.toString(),
    })));
    return result;
});
const getHostBookingsFromDB = (hostId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid host id");
    }
    const { status, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();
    // 1️⃣ Base Filter
    const match = {
        hostId: new mongoose_1.Types.ObjectId(hostId),
    };
    // 2️⃣ Status Filter
    if (status) {
        const statuses = status
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => Object.values(booking_interface_1.BOOKING_STATUS).map(String).includes(s));
        if (!statuses.length) {
            console.log("Current BOOKING_STATUS values:", Object.values(booking_interface_1.BOOKING_STATUS));
            console.log("Input status string:", status);
            throw new ApiErrors_1.default(400, "Invalid booking status filter");
        }
        match.bookingStatus = { $in: statuses };
    }
    // 3️⃣ Expiry & Overlapping Logic for REQUESTED and PENDING bookings (Removed hiding logic)
    const pipeline = [
        { $match: match },
    ];
    // 4️⃣ Final Aggregation with Pagination and Populate
    const [result] = yield booking_model_1.Booking.aggregate([
        ...pipeline,
        { $sort: { createdAt: -1 } },
        {
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: Number(limit) },
                    {
                        $lookup: {
                            from: "cars",
                            localField: "carId",
                            foreignField: "_id",
                            as: "carId",
                        },
                    },
                    { $unwind: { path: "$carId", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "userId",
                        },
                    },
                    { $unwind: { path: "$userId", preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "hostId",
                            foreignField: "_id",
                            as: "hostId",
                        },
                    },
                    { $unwind: { path: "$hostId", preserveNullAndEmptyArrays: true } },
                ],
                total: [{ $count: "count" }],
            },
        },
    ]);
    const data = result.data || [];
    const total = ((_b = (_a = result.total) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.count) || 0;
    const targetIds = data
        .map((b) => { var _a, _b; return (_b = (_a = b.userId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(); })
        .filter(Boolean);
    const reviewedSet = yield review_service_1.ReviewServices.getBulkReviewStatus(hostId, targetIds);
    const dataWithReviewStatus = data.map((b) => {
        var _a, _b;
        return (Object.assign(Object.assign({}, b), { isReviewed: reviewedSet.has((_b = (_a = b.userId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) }));
    });
    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPage: Math.ceil(total / Number(limit)),
        },
        data: dataWithReviewStatus,
    };
});
const getUserBookingsFromDB = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors_1.default(400, "Invalid user id");
    }
    const { status, page = 1, limit = 20 } = query;
    const filter = {
        userId: new mongoose_1.Types.ObjectId(userId),
    };
    // ---------- Status Filter ----------
    if (status) {
        const statuses = status
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => Object.values(booking_interface_1.BOOKING_STATUS).map(String).includes(s));
        if (!statuses.length) {
            console.log("Current BOOKING_STATUS values:", Object.values(booking_interface_1.BOOKING_STATUS));
            console.log("Input status string:", status);
            throw new ApiErrors_1.default(400, "Invalid booking status filter");
        }
        filter.bookingStatus = { $in: statuses };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = yield Promise.all([
        booking_model_1.Booking.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("carId")
            .populate("hostId")
            .lean(),
        booking_model_1.Booking.countDocuments(filter),
    ]);
    const targetIds = data
        .map((b) => { var _a, _b; return (_b = (_a = b.hostId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(); })
        .filter(Boolean);
    const reviewedSet = yield review_service_1.ReviewServices.getBulkReviewStatus(userId, targetIds);
    const dataWithReviewStatus = yield Promise.all(data.map((b) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const isExpired = b.bookingStatus === booking_interface_1.BOOKING_STATUS.EXPIRED;
        let isOverlapping = false;
        if ([booking_interface_1.BOOKING_STATUS.REQUESTED, booking_interface_1.BOOKING_STATUS.PENDING].includes(b.bookingStatus)) {
            const overlapping = yield booking_model_1.Booking.findOne({
                userId: b.userId,
                _id: { $ne: b._id },
                bookingStatus: {
                    $in: [booking_interface_1.BOOKING_STATUS.CONFIRMED, booking_interface_1.BOOKING_STATUS.ONGOING],
                },
                fromDate: { $lt: b.toDate },
                toDate: { $gt: b.fromDate },
            });
            isOverlapping = !!overlapping;
        }
        return Object.assign(Object.assign({}, b), { isReviewed: reviewedSet.has((_b = (_a = b.hostId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()), isExpired,
            isOverlapping, isPayable: b.bookingStatus === booking_interface_1.BOOKING_STATUS.PENDING &&
                !isExpired &&
                !isOverlapping });
    })));
    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPage: Math.ceil(total / Number(limit)),
        },
        data: dataWithReviewStatus,
    };
});
const getHostBookingByIdFromDB = (bookingId, hostId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(bookingId)) {
        throw new ApiErrors_1.default(400, "Invalid booking id");
    }
    if (!mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid host id");
    }
    const now = new Date();
    const booking = yield booking_model_1.Booking.findOne({
        _id: new mongoose_1.Types.ObjectId(bookingId),
        hostId: new mongoose_1.Types.ObjectId(hostId),
    })
        .populate("carId")
        .populate("userId")
        .populate("hostId")
        .lean();
    if (!booking) {
        throw new ApiErrors_1.default(404, "Booking not found");
    }
    console.log(booking, "Booking");
    const isReviewed = yield review_service_1.ReviewServices.checkIfAlreadyReviewed(hostId, booking.userId._id.toString());
    return Object.assign(Object.assign({}, booking), { isReviewed });
});
const getUserBookingByIdFromDB = (bookingId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(bookingId)) {
        throw new ApiErrors_1.default(400, "Invalid booking id");
    }
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors_1.default(400, "Invalid user id");
    }
    const booking = yield booking_model_1.Booking.findOne({
        _id: new mongoose_1.Types.ObjectId(bookingId),
        userId: new mongoose_1.Types.ObjectId(userId),
    })
        .populate("carId")
        .populate("hostId")
        .lean();
    if (!booking) {
        throw new ApiErrors_1.default(404, "Booking not found");
    }
    const isReviewed = yield review_service_1.ReviewServices.checkIfAlreadyReviewed(userId, booking.hostId._id.toString());
    const isExpired = booking.bookingStatus === booking_interface_1.BOOKING_STATUS.EXPIRED;
    let isOverlapping = false;
    if ([booking_interface_1.BOOKING_STATUS.REQUESTED, booking_interface_1.BOOKING_STATUS.PENDING].includes(booking.bookingStatus)) {
        const overlapping = yield booking_model_1.Booking.findOne({
            userId: booking.userId,
            _id: { $ne: booking._id },
            bookingStatus: {
                $in: [booking_interface_1.BOOKING_STATUS.CONFIRMED, booking_interface_1.BOOKING_STATUS.ONGOING],
            },
            fromDate: { $lt: booking.toDate },
            toDate: { $gt: booking.fromDate },
        });
        isOverlapping = !!overlapping;
    }
    return Object.assign(Object.assign({}, booking), { isReviewed,
        isExpired,
        isOverlapping, isPayable: booking.bookingStatus === booking_interface_1.BOOKING_STATUS.PENDING &&
            !isExpired &&
            !isOverlapping });
});
const approveBookingByHostFromDB = (bookingId, hostId) => __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.Booking.findById(bookingId);
    console.log(bookingId, "BookingId");
    if (!booking)
        throw new ApiErrors_1.default(404, "Booking not found");
    if (!booking.hostId.equals(hostId)) {
        throw new ApiErrors_1.default(403, "Unauthorized");
    }
    if (booking.bookingStatus !== booking_interface_1.BOOKING_STATUS.REQUESTED) {
        throw new ApiErrors_1.default(400, "Invalid booking state");
    }
    const now = new Date();
    if (new Date(booking.fromDate) < now) {
        throw new ApiErrors_1.default(400, "Booking request has expired");
    }
    // 2️⃣ Check overlapping confirmed/ongoing bookings for the user
    const overlapping = yield booking_model_1.Booking.findOne({
        userId: booking.userId,
        _id: { $ne: booking._id },
        bookingStatus: {
            $in: [booking_interface_1.BOOKING_STATUS.CONFIRMED, booking_interface_1.BOOKING_STATUS.ONGOING],
        },
        fromDate: { $lt: booking.toDate },
        toDate: { $gt: booking.fromDate },
    });
    if (overlapping) {
        throw new ApiErrors_1.default(400, "User already has a confirmed or ongoing booking for this time slot");
    }
    /**
     * 🔒 STRICT re-validation before approve
     * Ignore current booking itself
     */
    yield (0, booking_utils_1.validateAvailabilityStrictForApproval)(booking.carId.toString(), booking.fromDate, booking.toDate, booking._id.toString());
    booking.bookingStatus = booking_interface_1.BOOKING_STATUS.PENDING;
    booking.approvedAt = new Date();
    yield booking.save();
    //  Send notification to the user, host, and admin
    yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.userId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: booking._id.toString(),
    });
    yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.hostId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.HOST,
        referenceId: booking._id.toString(),
    });
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: booking._id.toString(),
        });
    }
    return booking;
});
// const cancelBookingFromDB = async (
//   bookingId: string,
//   actorId: string,
//   actorRole: USER_ROLES,
// ) => {
//   if (!Types.ObjectId.isValid(bookingId)) {
//     throw new ApiError(400, "Invalid booking id");
//   }
//   const booking = await Booking.findById(bookingId)
//     .populate("carId")
//     .populate("transactionId");
//   if (!booking) {
//     throw new ApiError(404, "Booking not found");
//   }
//   if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
//     throw new ApiError(400, "Booking already cancelled");
//   }
//   if (booking.bookingStatus === BOOKING_STATUS.COMPLETED) {
//     throw new ApiError(400, "Completed booking cannot be cancelled");
//   }
//   const isUserActor = actorRole === USER_ROLES.USER;
//   const isHostActor = actorRole === USER_ROLES.HOST;
//   const isAdminActor =
//     actorRole === USER_ROLES.ADMIN || actorRole === USER_ROLES.SUPER_ADMIN;
//   // Role-based permission check
//   if (isUserActor) {
//     if (!booking.userId.equals(actorId)) {
//       throw new ApiError(403, "You are not allowed to cancel this booking");
//     }
//     if (booking.isSelfBooking) {
//       throw new ApiError(403, "Self bookings cannot be cancelled by customer");
//     }
//   } else if (isHostActor) {
//     if (!booking.hostId.equals(actorId) || !booking.isSelfBooking) {
//       throw new ApiError(403, "Hosts can cancel only their own self bookings");
//     }
//   } else if (!isAdminActor) {
//     throw new ApiError(403, "You are not allowed to cancel this booking");
//   }
//   const now = new Date();
//   const transaction = booking.transactionId
//     ? await Transaction.findById(booking.transactionId)
//     : null;
//   if (
//     transaction &&
//     transaction.status === TRANSACTION_STATUS.SUCCESS &&
//     transaction.stripePaymentIntentId
//   ) {
//     const car = booking.carId as any;
//     if (!car) throw new ApiError(400, "Car details not found");
//     const fromDate = new Date(booking.fromDate);
//     const toDate = new Date(booking.toDate);
//     const totalDays =
//       Math.ceil(
//         (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
//       ) || 1;
//     const paidAmount = transaction.amount;
//     const rentalPrice = (booking as any).rentalPrice;
//     const platformFee = (booking as any).platformFee;
//     const totalRental = rentalPrice + platformFee;
//     const diffMs = fromDate.getTime() - now.getTime();
//     const diffHours = diffMs / (1000 * 60 * 60);
//     let chargeAmount = 0;
//     // Cancellation after pickup
//     if (now >= fromDate) {
//       // Multi-day prorated charge
//       const daysUsed = Math.min(
//         Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
//         totalDays,
//       );
//       // Charge for portion of rental price and platform fee used
//       chargeAmount = (daysUsed / totalDays) * totalRental;
//     }
//     // Cancellation < 72 hours before pickup
//     else if (diffHours < 72) {
//       // Charge 1 day's worth of total rental price
//       chargeAmount = totalRental / totalDays;
//     }
//     if (chargeAmount < 0) chargeAmount = 0;
//     if (chargeAmount > totalRental) chargeAmount = totalRental; // Should not exceed total rental
//     const refundAmount = paidAmount - chargeAmount;
//     if (refundAmount > 0 && transaction?.stripePaymentIntentId) {
//       await stripe.refunds.create({
//         payment_intent: transaction.stripePaymentIntentId as string,
//         amount: Math.round(refundAmount * 100),
//       });
//       transaction.status = TRANSACTION_STATUS.REFUNDED;
//       await transaction.save();
//       // Send refund notification to user and admin
//       await sendNotifications({
//         text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
//         receiver: booking.userId.toString(),
//         type: NOTIFICATION_TYPE.USER,
//         referenceId: booking._id.toString(),
//       });
//       const admin = await User.findOne({
//         role: USER_ROLES.SUPER_ADMIN,
//       }).select("_id");
//       if (admin) {
//         await sendNotifications({
//           text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
//           receiver: admin._id.toString(),
//           type: NOTIFICATION_TYPE.ADMIN,
//           referenceId: booking._id.toString(),
//         });
//       }
//     }
//   }
//   if (isUserActor) booking.isCanceledByUser = true;
//   if (isHostActor) booking.isCanceledByHost = true;
//   booking.bookingStatus = BOOKING_STATUS.CANCELLED;
//   booking.cancelledAt = new Date();
//   await booking.save();
//   // Update vehicle availability
//   if (booking.carId) {
//     await Car.findByIdAndUpdate(booking.carId._id, { isAvailable: true });
//   }
//   // Send notification to the user, host, and admin
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.userId.toString(),
//     type: NOTIFICATION_TYPE.USER,
//     referenceId: booking._id.toString(),
//   });
//   await sendNotifications({
//     text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//     receiver: booking.hostId.toString(),
//     type: NOTIFICATION_TYPE.HOST,
//     referenceId: booking._id.toString(),
//   });
//   const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
//     "_id",
//   );
//   if (admin) {
//     await sendNotifications({
//       text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
//       receiver: admin._id.toString(),
//       type: NOTIFICATION_TYPE.ADMIN,
//       referenceId: booking._id.toString(),
//     });
//   }
//   return booking;
// };
const cancelBookingFromDB = (bookingId, actorId, actorRole) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate Booking ID
    if (!mongoose_1.Types.ObjectId.isValid(bookingId)) {
        throw new ApiErrors_1.default(400, "Invalid booking id");
    }
    // Fetch booking with related info
    const booking = yield booking_model_1.Booking.findById(bookingId)
        .populate("carId")
        .populate("transactionId");
    if (!booking)
        throw new ApiErrors_1.default(404, "Booking not found");
    if (booking.bookingStatus === booking_interface_1.BOOKING_STATUS.CANCELLED) {
        throw new ApiErrors_1.default(400, "Booking already cancelled");
    }
    if (booking.bookingStatus === booking_interface_1.BOOKING_STATUS.COMPLETED) {
        throw new ApiErrors_1.default(400, "Completed booking cannot be cancelled");
    }
    //  Role-based permission
    const isUserActor = actorRole === user_1.USER_ROLES.USER;
    const isHostActor = actorRole === user_1.USER_ROLES.HOST;
    const isAdminActor = actorRole === user_1.USER_ROLES.ADMIN || actorRole === user_1.USER_ROLES.SUPER_ADMIN;
    if (isUserActor && !booking.userId.equals(actorId)) {
        throw new ApiErrors_1.default(403, "You are not allowed to cancel this booking");
    }
    else if (isHostActor && !booking.hostId.equals(actorId)) {
        throw new ApiErrors_1.default(403, "Hosts can cancel only their own bookings");
    }
    else if (!isUserActor && !isHostActor && !isAdminActor) {
        throw new ApiErrors_1.default(403, "You are not allowed to cancel this booking");
    }
    const now = new Date();
    const transaction = booking.transactionId
        ? yield transaction_model_1.Transaction.findById(booking.transactionId)
        : null;
    //  Refund logic (same for all actors)
    if (transaction && transaction.status === transaction_interface_1.TRANSACTION_STATUS.SUCCESS) {
        const car = booking.carId;
        if (!car)
            throw new ApiErrors_1.default(400, "Car details not found");
        const fromDate = new Date(booking.fromDate);
        const toDate = new Date(booking.toDate);
        const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        const paidAmount = transaction.amount;
        const rentalPrice = booking.rentalPrice;
        const platformFee = booking.platformFee;
        const totalRental = rentalPrice + platformFee;
        const diffMs = fromDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        let chargeAmount = 0;
        // Cancellation after pickup → prorated
        if (now >= fromDate) {
            const daysUsed = Math.min(Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)), totalDays);
            chargeAmount = (daysUsed / totalDays) * totalRental;
        }
        // Cancellation < 72 hours before pickup → 1 day charge
        else if (diffHours < 72) {
            chargeAmount = totalRental / totalDays;
        }
        // Sanity check
        chargeAmount = Math.max(0, Math.min(chargeAmount, totalRental));
        const refundAmount = paidAmount - chargeAmount;
        if (refundAmount > 0 && transaction.stripePaymentIntentId) {
            yield stripe_1.default.refunds.create({
                payment_intent: transaction.stripePaymentIntentId,
                amount: Math.round(refundAmount * 100),
            });
            transaction.status = transaction_interface_1.TRANSACTION_STATUS.REFUNDED;
            yield transaction.save();
            // Notification: User
            yield (0, notificationsHelper_1.sendNotifications)({
                text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
                receiver: booking.userId.toString(),
                type: notification_constant_1.NOTIFICATION_TYPE.USER,
                referenceId: booking._id.toString(),
            });
            // Notification: Admin
            const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id");
            if (admin) {
                yield (0, notificationsHelper_1.sendNotifications)({
                    text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
                    receiver: admin._id.toString(),
                    type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
                    referenceId: booking._id.toString(),
                });
            }
        }
    }
    //  Mark actor who cancelled
    if (isUserActor)
        booking.isCanceledByUser = true;
    if (isHostActor)
        booking.isCanceledByHost = true;
    if (isAdminActor)
        booking.isCanceledByAdmin = true;
    //  Update booking status
    booking.bookingStatus = booking_interface_1.BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    yield booking.save();
    // Update vehicle availability
    if (booking.carId) {
        yield car_model_1.Car.findByIdAndUpdate(booking.carId._id, { isAvailable: true });
    }
    //  Send status notifications
    yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.userId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: booking._id.toString(),
    });
    yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
        receiver: booking.hostId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.HOST,
        referenceId: booking._id.toString(),
    });
    const admin = yield user_model_1.User.findOne({ role: user_1.USER_ROLES.SUPER_ADMIN }).select("_id");
    if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
            text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
            receiver: admin._id.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
            referenceId: booking._id.toString(),
        });
    }
    return booking;
});
const getAllBookingsFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const searchTerm = ((_a = query.search) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "10", 10);
    const skip = (page - 1) * limit;
    const aggregationPipeline = [
        // Lookup car
        {
            $lookup: {
                from: "cars",
                localField: "carId",
                foreignField: "_id",
                as: "car",
            },
        },
        { $unwind: { path: "$car", preserveNullAndEmptyArrays: true } },
        // Lookup host
        {
            $lookup: {
                from: "users",
                localField: "hostId",
                foreignField: "_id",
                as: "host",
            },
        },
        { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
        // Lookup user
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ];
    // Search filter
    if (searchTerm) {
        aggregationPipeline.push({
            $match: {
                $or: [
                    { bookingId: { $regex: searchTerm, $options: "i" } },
                    { "car.model": { $regex: searchTerm, $options: "i" } },
                    { "car.vehicleId": { $regex: searchTerm, $options: "i" } },
                    { "car.brand": { $regex: searchTerm, $options: "i" } },
                    { "host.name": { $regex: searchTerm, $options: "i" } },
                    { "host.email": { $regex: searchTerm, $options: "i" } },
                    { "user.name": { $regex: searchTerm, $options: "i" } },
                    { "user.email": { $regex: searchTerm, $options: "i" } },
                ],
            },
        });
    }
    // Booking status filter
    if (query.bookingStatus &&
        Object.values(booking_interface_1.BOOKING_STATUS).includes(query.bookingStatus)) {
        aggregationPipeline.push({
            $match: {
                bookingStatus: query.bookingStatus,
            },
        });
    }
    // Count total before pagination
    const totalMeta = yield booking_model_1.Booking.aggregate([
        ...aggregationPipeline,
        { $count: "total" },
    ]);
    const total = ((_b = totalMeta[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
    // Apply sort if provided
    if (query.sortBy && query.sortOrder) {
        const sortOrder = query.sortOrder.toLowerCase() === "desc" ? -1 : 1;
        aggregationPipeline.push({ $sort: { [query.sortBy]: sortOrder } });
    }
    else {
        aggregationPipeline.push({ $sort: { createdAt: -1 } });
    }
    // Pagination
    aggregationPipeline.push({ $skip: skip }, { $limit: limit });
    const bookings = yield booking_model_1.Booking.aggregate(aggregationPipeline);
    return {
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
        bookings,
    };
});
const getSelfBookingsByHost = (hostId, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (!hostId || !mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid hostId");
    }
    const filter = {
        hostId: new mongoose_1.Types.ObjectId(hostId),
        isSelfBooking: true,
    };
    if (status)
        filter.bookingStatus = status;
    const bookings = yield booking_model_1.Booking.find(filter)
        .populate("carId")
        .sort({ fromDate: -1 }) // latest first
        .lean();
    return bookings;
});
exports.BookingServices = {
    createBookingToDB,
    getHostBookingsFromDB,
    getUserBookingsFromDB,
    getHostBookingByIdFromDB,
    getUserBookingByIdFromDB,
    approveBookingByHostFromDB,
    cancelBookingFromDB,
    // confirmBookingAfterPaymentFromDB,
    getAllBookingsFromDB,
    getSelfBookingsByHost,
};
