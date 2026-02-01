import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { BookingServices } from "./booking.service";

const createBookingToDB = catchAsync(async (req, res) => {
    const payload = req.body;
    const { id: userId } = req.user as { id: string };
    const result = await BookingServices.createBookingToDB(payload, userId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Booking created successfully",
        data: result,
    });
});

const getHostBookings = catchAsync(async (req, res) => {
    const { id: userId } = req.user as { id: string };

    const result = await BookingServices.getHostBookingsFromDB(userId, req.query);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Host bookings fetched successfully",
        data: result,
    });
});

const getUserBookings = catchAsync(async (req, res) => {
    const { id: userId } = req.user as { id: string };

    const result = await BookingServices.getUserBookingsFromDB(userId, req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User bookings fetched successfully",
        data: result,
    });
});

const approveBookingByHost = catchAsync(async (req, res) => {
    const { id: hostId } = req.user as { id: string };
    const { bookingId } = req.params;
    console.log(bookingId, "BookingId")
    const result = await BookingServices.approveBookingByHostFromDB(bookingId, hostId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Booking approved successfully",
        data: result,
    });
})



export const BookingControllers = {
    createBookingToDB,
    getHostBookings,
    getUserBookings,
    approveBookingByHost,
}