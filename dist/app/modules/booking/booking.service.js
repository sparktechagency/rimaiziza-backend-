"use strict";
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
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const generateYearBasedId_1 = require("../../../helpers/generateYearBasedId");
const car_model_1 = require("../car/car.model");
const car_utils_1 = require("../car/car.utils");
const booking_interface_1 = require("./booking.interface");
const booking_model_1 = require("./booking.model");
const booking_utils_1 = require("./booking.utils");
const createBookingToDB = (payload, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield (0, car_utils_1.validateAvailabilityStrict)(payload.carId, payload.fromDate, payload.toDate);
    payload.userId = userId;
    const bookingId = yield (0, generateYearBasedId_1.generateBookingId)();
    payload.bookingId = bookingId;
    const car = yield car_model_1.Car.findById(payload.carId);
    if (!car)
        throw new ApiErrors_1.default(404, "Car not found");
    const isSelfBooking = ((_a = car === null || car === void 0 ? void 0 : car.assignedHosts) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    const bookingStatus = isSelfBooking ? booking_interface_1.BOOKING_STATUS.CONFIRMED : booking_interface_1.BOOKING_STATUS.REQUESTED;
    const totalAmount = (0, booking_utils_1.calculateFirstTimeBookingAmount)(new Date(payload.fromDate), new Date(payload.toDate), car);
    const result = yield booking_model_1.Booking.create(Object.assign(Object.assign({}, payload), { hostId: car.assignedHosts, bookingStatus: bookingStatus, totalAmount,
        isSelfBooking }));
    return result;
});
const getHostBookingsFromDB = (hostId, query) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(hostId)) {
        throw new ApiErrors_1.default(400, "Invalid host id");
    }
    const { status, page = 1, limit = 20, } = query;
    const filter = {
        hostId: new mongoose_1.Types.ObjectId(hostId),
    };
    // ---------- Status Filter ----------
    if (status) {
        const statuses = status
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => Object.values(booking_interface_1.BOOKING_STATUS).includes(s));
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
const getUserBookingsFromDB = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors_1.default(400, "Invalid user id");
    }
    const { status, page = 1, limit = 20, } = query;
    const filter = {
        userId: new mongoose_1.Types.ObjectId(userId),
    };
    // ---------- Status Filter ----------
    if (status) {
        const statuses = status
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => Object.values(booking_interface_1.BOOKING_STATUS).includes(s));
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
    /**
     * 🔒 STRICT re-validation before approve
     * Ignore current booking itself
     */
    yield (0, booking_utils_1.validateAvailabilityStrictForApproval)(booking.carId.toString(), booking.fromDate, booking.toDate, booking._id.toString());
    booking.bookingStatus = booking_interface_1.BOOKING_STATUS.PENDING;
    yield booking.save();
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
                as: "car"
            }
        },
        { $unwind: { path: "$car", preserveNullAndEmptyArrays: true } },
        // Lookup host
        {
            $lookup: {
                from: "users",
                localField: "hostId",
                foreignField: "_id",
                as: "host"
            }
        },
        { $unwind: { path: "$host", preserveNullAndEmptyArrays: true } },
        // Lookup user
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
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
                ]
            }
        });
    }
    // Booking status filter
    if (query.bookingStatus && Object.values(booking_interface_1.BOOKING_STATUS).includes(query.bookingStatus)) {
        aggregationPipeline.push({
            $match: {
                bookingStatus: query.bookingStatus
            }
        });
    }
    // Count total before pagination
    const totalMeta = yield booking_model_1.Booking.aggregate([...aggregationPipeline, { $count: "total" }]);
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
            totalPages: Math.ceil(total / limit)
        },
        bookings
    };
});
exports.BookingServices = {
    createBookingToDB,
    getHostBookingsFromDB,
    getUserBookingsFromDB,
    approveBookingByHostFromDB,
    // confirmBookingAfterPaymentFromDB,
    getAllBookingsFromDB,
};
