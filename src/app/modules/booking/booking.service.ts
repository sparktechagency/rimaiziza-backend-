import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import stripe from "../../../config/stripe";
import { generateBookingId } from "../../../helpers/generateYearBasedId";
import { USER_ROLES } from "../../../enums/user";
import { Car } from "../car/car.model";
import { validateAvailabilityStrict } from "../car/car.utils";
import { TRANSACTION_STATUS } from "../transaction/transaction.interface";
import { Transaction } from "../transaction/transaction.model";
import { BOOKING_STATUS } from "./booking.interface";
import { Booking } from "./booking.model";
import {
  calculateFirstTimeBookingAmount,
  validateAvailabilityStrictForApproval,
} from "./booking.utils";
import { getDynamicCharges } from "../charges/charges.service";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { User } from "../user/user.model";

const createBookingToDB = async (payload: any, userId: string) => {
  await validateAvailabilityStrict(
    payload.carId,
    payload.fromDate,
    payload.toDate,
  );

  payload.userId = userId;

  const bookingId = await generateBookingId();
  payload.bookingId = bookingId;

  const car = await Car.findById(payload.carId);
  if (!car) throw new ApiError(404, "Car not found");

  const isSelfBooking = car?.assignedHosts?.toString() === userId;

  const bookingStatus = isSelfBooking
    ? BOOKING_STATUS.CONFIRMED
    : BOOKING_STATUS.REQUESTED;

  const totalAmount = calculateFirstTimeBookingAmount(
    new Date(payload.fromDate),
    new Date(payload.toDate),
    car,
  );

  const result = await Booking.create({
    ...payload,
    hostId: car.assignedHosts,
    bookingStatus,
    totalAmount,
    isSelfBooking,
  });

  const notificationText = `Booking ${result.bookingId} status is ${result.bookingStatus}`;

  // 1️⃣ Collect receivers
  const receivers = [
    {
      receiver: result.userId.toString(),
      type: NOTIFICATION_TYPE.USER,
    },
    {
      receiver: result.hostId.toString(),
      type: NOTIFICATION_TYPE.HOST,
    },
  ];

  // 2️⃣ Add admin if exists
  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select("_id");
  if (admin) {
    receivers.push({
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
    });
  }

  // 3️⃣ Deduplicate by receiver
  const uniqueReceivers = new Map<string, typeof receivers[0]>();

  for (const r of receivers) {
    if (!uniqueReceivers.has(r.receiver)) {
      uniqueReceivers.set(r.receiver, r);
    }
  }

  // 4️⃣ Send notifications
  await Promise.all(
    Array.from(uniqueReceivers.values()).map((r) =>
      sendNotifications({
        text: notificationText,
        receiver: r.receiver,
        type: r.type,
        referenceId: result._id.toString(),
      }),
    ),
  );

  return result;
};

const getHostBookingsFromDB = async (hostId: string, query: any) => {
  if (!Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid host id");
  }

  const { status, page = 1, limit = 20 } = query;

  const filter: any = {
    hostId: new Types.ObjectId(hostId),
  };

  // ---------- Status Filter ----------
  if (status) {
    const statuses = status
      .split(",")
      .map((s: any) => s.trim().toUpperCase())
      .filter((s: any) =>
        Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS),
      );

    if (!statuses.length) {
      throw new ApiError(400, "Invalid booking status filter");
    }

    filter.bookingStatus = { $in: statuses };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("carId")
      .populate("userId")
      .populate("hostId")
      .lean(),

    Booking.countDocuments(filter),
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
};

const getUserBookingsFromDB = async (userId: string, query: any) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const { status, page = 1, limit = 20 } = query;

  const filter: any = {
    userId: new Types.ObjectId(userId),
  };

  // ---------- Status Filter ----------
  if (status) {
    const statuses = status
      .split(",")
      .map((s: string) => s.trim().toUpperCase())
      .filter((s: string) =>
        Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS),
      );

    if (!statuses.length) {
      throw new ApiError(400, "Invalid booking status filter");
    }

    filter.bookingStatus = { $in: statuses };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("carId")
      .populate("hostId")
      .lean(),

    Booking.countDocuments(filter),
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
};

const getHostBookingByIdFromDB = async (bookingId: string, hostId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, "Invalid booking id");
  }

  if (!Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid host id");
  }

  const booking = await Booking.findOne({
    _id: new Types.ObjectId(bookingId),
    hostId: new Types.ObjectId(hostId),
  })
    .populate("carId")
    .populate("userId")
    .populate("hostId")
    .lean();

  console.log(booking, "Booking");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return booking;
};

const getUserBookingByIdFromDB = async (bookingId: string, userId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, "Invalid booking id");
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const booking = await Booking.findOne({
    _id: new Types.ObjectId(bookingId),
    userId: new Types.ObjectId(userId),
  })
    .populate("carId")
    .populate("hostId")
    .lean();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return booking;
};

const approveBookingByHostFromDB = async (
  bookingId: string,
  hostId: string,
) => {
  const booking = await Booking.findById(bookingId);

  console.log(bookingId, "BookingId");

  if (!booking) throw new ApiError(404, "Booking not found");

  if (!booking.hostId.equals(hostId)) {
    throw new ApiError(403, "Unauthorized");
  }

  if (booking.bookingStatus !== BOOKING_STATUS.REQUESTED) {
    throw new ApiError(400, "Invalid booking state");
  }

  /**
   * 🔒 STRICT re-validation before approve
   * Ignore current booking itself
   */
  await validateAvailabilityStrictForApproval(
    booking.carId.toString(),
    booking.fromDate,
    booking.toDate,
    booking._id.toString(),
  );

  booking.bookingStatus = BOOKING_STATUS.PENDING;
  await booking.save();

  //  Send notification to the user, host, and admin
  await sendNotifications({
    text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
    receiver: booking.userId.toString(),
    type: NOTIFICATION_TYPE.USER,
    referenceId: booking._id.toString(),
  });

  await sendNotifications({
    text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
    receiver: booking.hostId.toString(),
    type: NOTIFICATION_TYPE.HOST,
    referenceId: booking._id.toString(),
  });

  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id",
  );
  if (admin) {
    await sendNotifications({
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: booking._id.toString(),
    });
  }

  return booking;
};

const cancelBookingFromDB = async (
  bookingId: string,
  actorId: string,
  actorRole: USER_ROLES,
) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, "Invalid booking id");
  }

  const booking = await Booking.findById(bookingId)
    .populate("carId")
    .populate("transactionId");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
    throw new ApiError(400, "Booking already cancelled");
  }

  if (booking.bookingStatus === BOOKING_STATUS.COMPLETED) {
    throw new ApiError(400, "Completed booking cannot be cancelled");
  }

  const isUserActor = actorRole === USER_ROLES.USER;
  const isHostActor = actorRole === USER_ROLES.HOST;
  const isAdminActor =
    actorRole === USER_ROLES.ADMIN || actorRole === USER_ROLES.SUPER_ADMIN;

  // Role-based permission check
  if (isUserActor) {
    if (!booking.userId.equals(actorId)) {
      throw new ApiError(403, "You are not allowed to cancel this booking");
    }
    if (booking.isSelfBooking) {
      throw new ApiError(403, "Self bookings cannot be cancelled by customer");
    }
  } else if (isHostActor) {
    if (!booking.hostId.equals(actorId) || !booking.isSelfBooking) {
      throw new ApiError(403, "Hosts can cancel only their own self bookings");
    }
  } else if (!isAdminActor) {
    throw new ApiError(403, "You are not allowed to cancel this booking");
  }

  const now = new Date();
  const transaction = booking.transactionId
    ? await Transaction.findById(booking.transactionId)
    : null;

  if (
    transaction &&
    transaction.status === TRANSACTION_STATUS.SUCCESS &&
    transaction.stripePaymentIntentId
  ) {
    const car = booking.carId as any;

    if (!car) throw new ApiError(400, "Car details not found");

    const fromDate = new Date(booking.fromDate);
    const toDate = new Date(booking.toDate);
    const totalDays =
      Math.ceil(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
      ) || 1;

    const paidAmount = transaction.amount;
    const dailyPrice = car.dailyPrice;

    // Get dynamic charges
    const { platformFee, hostCommission, adminCommission } =
      await getDynamicCharges({ totalAmount: paidAmount });

    const diffMs = fromDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let chargeAmount = 0;

    // Cancellation after pickup
    if (now >= fromDate) {
      // Multi-day prorated charge
      const daysUsed = Math.min(
        Math.ceil((now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
        totalDays,
      );
      chargeAmount =
        daysUsed * dailyPrice + platformFee + hostCommission + adminCommission;
    }
    // Cancellation < 72 hours before pickup
    else if (diffHours < 72) {
      chargeAmount = dailyPrice;
    }

    if (chargeAmount < 0) chargeAmount = 0;
    if (chargeAmount > paidAmount) chargeAmount = paidAmount;

    const refundAmount = paidAmount - chargeAmount;

    if (refundAmount > 0) {
      await stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100),
      });
      transaction.status = TRANSACTION_STATUS.REFUNDED;
      await transaction.save();

      // Send refund notification to user and admin
      await sendNotifications({
        text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
        receiver: booking.userId.toString(),
        type: NOTIFICATION_TYPE.USER,
        referenceId: booking._id.toString(),
      });

      const admin = await User.findOne({
        role: USER_ROLES.SUPER_ADMIN,
      }).select("_id");
      if (admin) {
        await sendNotifications({
          text: `Refund of ${refundAmount} processed for booking ${booking.bookingId}`,
          receiver: admin._id.toString(),
          type: NOTIFICATION_TYPE.ADMIN,
          referenceId: booking._id.toString(),
        });
      }
    }
  }

  if (isUserActor) booking.isCanceledByUser = true;
  if (isHostActor) booking.isCanceledByHost = true;

  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  await booking.save();

  // Update vehicle availability
  if (booking.carId) {
    await Car.findByIdAndUpdate(booking.carId._id, { isAvailable: true });
  }

  // Send notification to the user, host, and admin
  await sendNotifications({
    text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
    receiver: booking.userId.toString(),
    type: NOTIFICATION_TYPE.USER,
    referenceId: booking._id.toString(),
  });

  await sendNotifications({
    text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
    receiver: booking.hostId.toString(),
    type: NOTIFICATION_TYPE.HOST,
    referenceId: booking._id.toString(),
  });

  const admin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).select(
    "_id",
  );
  if (admin) {
    await sendNotifications({
      text: `Booking ${booking.bookingId} status is ${booking.bookingStatus}`,
      receiver: admin._id.toString(),
      type: NOTIFICATION_TYPE.ADMIN,
      referenceId: booking._id.toString(),
    });
  }

  return booking;
};

const getAllBookingsFromDB = async (query: any) => {
  const searchTerm = query.search?.toLowerCase() || "";
  const page = parseInt(query.page || "1", 10);
  const limit = parseInt(query.limit || "10", 10);
  const skip = (page - 1) * limit;

  const aggregationPipeline: any[] = [
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
    Object.values(BOOKING_STATUS).includes(query.bookingStatus)
  ) {
    aggregationPipeline.push({
      $match: {
        bookingStatus: query.bookingStatus,
      },
    });
  }

  // Count total before pagination
  const totalMeta = await Booking.aggregate([
    ...aggregationPipeline,
    { $count: "total" },
  ]);
  const total = totalMeta[0]?.total || 0;

  // Apply sort if provided
  if (query.sortBy && query.sortOrder) {
    const sortOrder = query.sortOrder.toLowerCase() === "desc" ? -1 : 1;
    aggregationPipeline.push({ $sort: { [query.sortBy]: sortOrder } });
  } else {
    aggregationPipeline.push({ $sort: { createdAt: -1 } });
  }

  // Pagination
  aggregationPipeline.push({ $skip: skip }, { $limit: limit });

  const bookings = await Booking.aggregate(aggregationPipeline);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    bookings,
  };
};

const getSelfBookingsByHost = async (
  hostId: string,
  status?: BOOKING_STATUS,
) => {
  if (!hostId || !Types.ObjectId.isValid(hostId)) {
    throw new ApiError(400, "Invalid hostId");
  }

  const filter: any = {
    hostId: new Types.ObjectId(hostId),
    isSelfBooking: true,
  };

  if (status) filter.bookingStatus = status;

  const bookings = await Booking.find(filter)
    .populate("carId")
    .sort({ fromDate: -1 }) // latest first
    .lean();

  return bookings;
};

export const BookingServices = {
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
