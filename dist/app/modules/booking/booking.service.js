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
exports.BookingServices = void 0;
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
const charges_service_1 = require("../charges/charges.service");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const user_model_1 = require("../user/user.model");
const createBookingToDB = (payload, userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield (0, car_utils_1.validateAvailabilityStrict)(
      payload.carId,
      payload.fromDate,
      payload.toDate,
    );
    payload.userId = userId;
    const bookingId = yield (0, generateYearBasedId_1.generateBookingId)();
    payload.bookingId = bookingId;
    const car = yield car_model_1.Car.findById(payload.carId);
    if (!car) throw new ApiErrors_1.default(404, "Car not found");
    const isSelfBooking =
      ((_a = car === null || car === void 0 ? void 0 : car.assignedHosts) ===
        null || _a === void 0
        ? void 0
        : _a.toString()) === userId;
    const bookingStatus = isSelfBooking
      ? booking_interface_1.BOOKING_STATUS.CONFIRMED
      : booking_interface_1.BOOKING_STATUS.REQUESTED;
    const totalAmount = (0, booking_utils_1.calculateFirstTimeBookingAmount)(
      new Date(payload.fromDate),
      new Date(payload.toDate),
      car,
    );
    const result = yield booking_model_1.Booking.create(
      Object.assign(Object.assign({}, payload), {
        hostId: car.assignedHosts,
        bookingStatus: bookingStatus,
        totalAmount,
        isSelfBooking,
      }),
    );
    try {
      yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${result.bookingId} status is ${result.bookingStatus}`,
        receiver: result.userId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
        referenceId: result._id.toString(),
      });
      yield (0, notificationsHelper_1.sendNotifications)({
        text: `Booking ${result.bookingId} status is ${result.bookingStatus}`,
        receiver: result.hostId.toString(),
        type: notification_constant_1.NOTIFICATION_TYPE.HOST,
        referenceId: result._id.toString(),
      });
      const admin = yield user_model_1.User.findOne({
        role: user_1.USER_ROLES.SUPER_ADMIN,
      }).select("_id");
      if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
          text: `Booking ${result.bookingId} status is ${result.bookingStatus}`,
          receiver: admin._id.toString(),
          type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
          referenceId: result._id.toString(),
        });
      }
    } catch (error) {}
    return result;
  });
const getHostBookingsFromDB = (hostId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(hostId)) {
      throw new ApiErrors_1.default(400, "Invalid host id");
    }
    const { status, page = 1, limit = 20 } = query;
    const filter = {
      hostId: new mongoose_1.Types.ObjectId(hostId),
    };
    // ---------- Status Filter ----------
    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) =>
          Object.values(booking_interface_1.BOOKING_STATUS).includes(s),
        );
      if (!statuses.length) {
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
        .populate("userId")
        .populate("hostId")
        .lean(),
      booking_model_1.Booking.countDocuments(filter),
    ]);
    return {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPage: Math.ceil(total / Number(limit)),
      },
      data,
    };
  });
const getUserBookingsFromDB = (userId, query) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
        .filter((s) =>
          Object.values(booking_interface_1.BOOKING_STATUS).includes(s),
        );
      if (!statuses.length) {
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
    return {
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPage: Math.ceil(total / Number(limit)),
      },
      data,
    };
  });
const approveBookingByHostFromDB = (bookingId, hostId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const booking = yield booking_model_1.Booking.findById(bookingId);
    console.log(bookingId, "BookingId");
    if (!booking) throw new ApiErrors_1.default(404, "Booking not found");
    if (!booking.hostId.equals(hostId)) {
      throw new ApiErrors_1.default(403, "Unauthorized");
    }
    if (
      booking.bookingStatus !== booking_interface_1.BOOKING_STATUS.REQUESTED
    ) {
      throw new ApiErrors_1.default(400, "Invalid booking state");
    }
    /**
     * 🔒 STRICT re-validation before approve
     * Ignore current booking itself
     */
    yield (0, booking_utils_1.validateAvailabilityStrictForApproval)(
      booking.carId.toString(),
      booking.fromDate,
      booking.toDate,
      booking._id.toString(),
    );
    booking.bookingStatus = booking_interface_1.BOOKING_STATUS.PENDING;
    yield booking.save();
    try {
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
      const admin = yield user_model_1.User.findOne({
        role: user_1.USER_ROLES.SUPER_ADMIN,
      }).select("_id");
      if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
          text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
          receiver: admin._id.toString(),
          type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
          referenceId: booking._id.toString(),
        });
      }
    } catch (error) {}
    return booking;
  });
const cancelBookingFromDB = (bookingId, actorId, actorRole) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(bookingId)) {
      throw new ApiErrors_1.default(400, "Invalid booking id");
    }
    const booking = yield booking_model_1.Booking.findById(bookingId)
      .populate("carId")
      .populate("transactionId");
    if (!booking) {
      throw new ApiErrors_1.default(404, "Booking not found");
    }
    if (
      booking.bookingStatus === booking_interface_1.BOOKING_STATUS.CANCELLED
    ) {
      throw new ApiErrors_1.default(400, "Booking already cancelled");
    }
    if (
      booking.bookingStatus === booking_interface_1.BOOKING_STATUS.COMPLETED
    ) {
      throw new ApiErrors_1.default(
        400,
        "Completed booking cannot be cancelled",
      );
    }
    const isUserActor = actorRole === user_1.USER_ROLES.USER;
    const isHostActor = actorRole === user_1.USER_ROLES.HOST;
    const isAdminActor =
      actorRole === user_1.USER_ROLES.ADMIN ||
      actorRole === user_1.USER_ROLES.SUPER_ADMIN;
    // Role-based permission check
    if (isUserActor) {
      if (!booking.userId.equals(actorId)) {
        throw new ApiErrors_1.default(
          403,
          "You are not allowed to cancel this booking",
        );
      }
      if (booking.isSelfBooking) {
        throw new ApiErrors_1.default(
          403,
          "Self bookings cannot be cancelled by customer",
        );
      }
    } else if (isHostActor) {
      if (!booking.hostId.equals(actorId) || !booking.isSelfBooking) {
        throw new ApiErrors_1.default(
          403,
          "Hosts can cancel only their own self bookings",
        );
      }
    } else if (!isAdminActor) {
      throw new ApiErrors_1.default(
        403,
        "You are not allowed to cancel this booking",
      );
    }
    const now = new Date();
    const transaction = booking.transactionId
      ? yield transaction_model_1.Transaction.findById(booking.transactionId)
      : null;
    if (
      transaction &&
      transaction.status ===
        transaction_interface_1.TRANSACTION_STATUS.SUCCESS &&
      transaction.stripePaymentIntentId
    ) {
      const car = booking.carId;
      if (!car) throw new ApiErrors_1.default(400, "Car details not found");
      const fromDate = new Date(booking.fromDate);
      const toDate = new Date(booking.toDate);
      const totalDays =
        Math.ceil(
          (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
        ) || 1;
      const paidAmount = transaction.amount;
      const dailyPrice = car.dailyPrice;
      // Get dynamic charges
      const { platformFee, hostCommission, adminCommission } = yield (0,
      charges_service_1.getDynamicCharges)({ totalAmount: paidAmount });
      const diffMs = fromDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      let chargeAmount = 0;
      // Cancellation after pickup
      if (now >= fromDate) {
        // Multi-day prorated charge
        const daysUsed = Math.min(
          Math.ceil(
            (now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
          totalDays,
        );
        chargeAmount =
          daysUsed * dailyPrice +
          platformFee +
          hostCommission +
          adminCommission;
      }
      // Cancellation < 72 hours before pickup
      else if (diffHours < 72) {
        chargeAmount = dailyPrice;
      }
      if (chargeAmount < 0) chargeAmount = 0;
      if (chargeAmount > paidAmount) chargeAmount = paidAmount;
      const refundAmount = paidAmount - chargeAmount;
      if (refundAmount > 0) {
        yield stripe_1.default.refunds.create({
          payment_intent: transaction.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
        });
        transaction.status =
          transaction_interface_1.TRANSACTION_STATUS.REFUNDED;
        yield transaction.save();
        try {
          yield (0, notificationsHelper_1.sendNotifications)({
            text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
            receiver: booking.userId.toString(),
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: booking._id.toString(),
          });
          const admin = yield user_model_1.User.findOne({
            role: user_1.USER_ROLES.SUPER_ADMIN,
          }).select("_id");
          if (admin) {
            yield (0, notificationsHelper_1.sendNotifications)({
              text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
              receiver: admin._id.toString(),
              type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
              referenceId: booking._id.toString(),
            });
          }
        } catch (error) {}
      }
    }
    if (isUserActor) booking.isCanceledByUser = true;
    if (isHostActor) booking.isCanceledByHost = true;
    booking.bookingStatus = booking_interface_1.BOOKING_STATUS.CANCELLED;
    yield booking.save();
    // Update vehicle availability
    if (booking.carId) {
      yield car_model_1.Car.findByIdAndUpdate(booking.carId._id, {
        isAvailable: true,
      });
    }
    try {
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
      const admin = yield user_model_1.User.findOne({
        role: user_1.USER_ROLES.SUPER_ADMIN,
      }).select("_id");
      if (admin) {
        yield (0, notificationsHelper_1.sendNotifications)({
          text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
          receiver: admin._id.toString(),
          type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
          referenceId: booking._id.toString(),
        });
      }
    } catch (error) {}
    return booking;
  });
// const confirmBookingAfterPaymentFromDB = async (
//   bookingId: string,
//   userId: string,
// ) => {
//   const booking = await Booking.findById(bookingId);
//   if (!booking || booking.bookingStatus !== BOOKING_STATUS.PENDING) {
//     throw new ApiError(400, "Invalid booking state");
//   }
//   //  Ownership validation
//   if (!booking.userId.equals(userId)) {
//     throw new ApiError(403, "Unauthorized booking confirmation");
//   }
//   if (booking.isSelfBooking) {
//     throw new ApiError(400, "Self booking does not require payment");
//   }
//   // Re-check availability (race condition safe)
//   await validateAvailabilityStrict(
//     booking.carId.toString(),
//     booking.fromDate,
//     booking.toDate
//   );
//   // Confirm
//   booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
//   await booking.save();
//   return booking;
// };
const getAllBookingsFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const searchTerm =
      ((_a = query.search) === null || _a === void 0
        ? void 0
        : _a.toLowerCase()) || "";
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
    if (
      query.bookingStatus &&
      Object.values(booking_interface_1.BOOKING_STATUS).includes(
        query.bookingStatus,
      )
    ) {
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
    const total =
      ((_b = totalMeta[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
    // Apply sort if provided
    if (query.sortBy && query.sortOrder) {
      const sortOrder = query.sortOrder.toLowerCase() === "desc" ? -1 : 1;
      aggregationPipeline.push({ $sort: { [query.sortBy]: sortOrder } });
    } else {
      aggregationPipeline.push({ $sort: { createdAt: -1 } });
    }
    // Pagination
    aggregationPipeline.push({ $skip: skip }, { $limit: limit });
    const bookings =
      yield booking_model_1.Booking.aggregate(aggregationPipeline);
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
const getSelfBookingsByHost = (hostId, status) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!hostId || !mongoose_1.Types.ObjectId.isValid(hostId)) {
      throw new ApiErrors_1.default(400, "Invalid hostId");
    }
    const filter = {
      hostId: new mongoose_1.Types.ObjectId(hostId),
      isSelfBooking: true,
    };
    if (status) filter.bookingStatus = status;
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
  approveBookingByHostFromDB,
  cancelBookingFromDB,
  // confirmBookingAfterPaymentFromDB,
  getAllBookingsFromDB,
  getSelfBookingsByHost,
};
