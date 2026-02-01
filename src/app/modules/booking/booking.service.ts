import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { generateBookingId } from "../../../helpers/generateYearBasedId";
import { Car } from "../car/car.model";
import { validateAvailabilityStrict } from "../car/car.utils";
import { BOOKING_STATUS } from "./booking.interface";
import { Booking } from "./booking.model";
import { calculateFirstTimeBookingAmount, validateAvailabilityStrictForApproval } from "./booking.utils";

// self booking ta bad ase, booking calculation
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
    const bookingStatus = isSelfBooking ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.REQUESTED;

    const totalAmount = calculateFirstTimeBookingAmount(
        new Date(payload.fromDate),
        new Date(payload.toDate),
        car,
    );

    const result = await Booking.create({
        ...payload,
        hostId: car.assignedHosts,
        bookingStatus: bookingStatus,
        totalAmount,
        isSelfBooking,
    });

    return result;
};

const getHostBookingsFromDB = async (
    hostId: string,
    query: any
) => {
    if (!Types.ObjectId.isValid(hostId)) {
        throw new ApiError(400, "Invalid host id");
    }

    const {
        status,
        page = 1,
        limit = 20,
    } = query;

    const filter: any = {
        hostId: new Types.ObjectId(hostId),
    };

    // ---------- Status Filter ----------
    if (status) {
        const statuses = status
            .split(",")
            .map((s: any) => s.trim().toUpperCase())
            .filter((s: any) => Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS));

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

const getUserBookingsFromDB = async (
    userId: string,
    query: any
) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const {
        status,
        page = 1,
        limit = 20,
    } = query;

    const filter: any = {
        userId: new Types.ObjectId(userId),
    };

    // ---------- Status Filter ----------
    if (status) {
        const statuses = status
            .split(",")
            .map((s: string) => s.trim().toUpperCase())
            .filter((s: string) =>
                Object.values(BOOKING_STATUS).includes(s as BOOKING_STATUS)
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

const approveBookingByHostFromDB = async (
    bookingId: string,
    hostId: string
) => {
    const booking = await Booking.findById(bookingId);

    console.log(bookingId, "BookingId")

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
        booking._id.toString()
    );

    booking.bookingStatus = BOOKING_STATUS.PENDING;
    await booking.save();

    return booking;
};

const confirmBookingAfterPaymentFromDB = async (
    bookingId: string,
    userId: string,
) => {
    const booking = await Booking.findById(bookingId);

    if (!booking || booking.bookingStatus !== BOOKING_STATUS.PENDING) {
        throw new ApiError(400, "Invalid booking state");
    }

    //  Ownership validation
    if (!booking.userId.equals(userId)) {
        throw new ApiError(403, "Unauthorized booking confirmation");
    }

    if (booking.isSelfBooking) {
        throw new ApiError(400, "Self booking does not require payment");
    }


    // Re-check availability (race condition safe)
    await validateAvailabilityStrict(
        booking.carId.toString(),
        booking.fromDate,
        booking.toDate
    );

    // Confirm
    booking.bookingStatus = BOOKING_STATUS.CONFIRMED;

    await booking.save();
    return booking;
};

export const BookingServices = {
    createBookingToDB,
    getHostBookingsFromDB,
    getUserBookingsFromDB,
    approveBookingByHostFromDB,
    confirmBookingAfterPaymentFromDB,
}