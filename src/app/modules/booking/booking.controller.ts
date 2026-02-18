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

const cancelBooking = catchAsync(async (req, res) => {
    const { id: actorId, role } = req.user as { id: string; role: any };
    const { bookingId } = req.params;

    const result = await BookingServices.cancelBookingFromDB(
        bookingId,
        actorId,
        role
    );

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Booking cancelled successfully",
        data: result,
    });
});

// const confirmBookingAfterPayment = catchAsync(async (req, res) => {
//     const { id: userId } = req.user as { id: string };
//     const { bookingId } = req.params;
//     const result = await BookingServices.confirmBookingAfterPaymentFromDB(bookingId, userId);
//     sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: "Booking confirmed successfully",
//         data: result,
//     });
// })

const getAllBookings = catchAsync(async (req, res) => {
    const result = await BookingServices.getAllBookingsFromDB(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All bookings fetched successfully",
        data: result.bookings,
        meta: result.meta,
    });
});



export const BookingControllers = {
    createBookingToDB,
    getHostBookings,
    getUserBookings,
    approveBookingByHost,
    cancelBooking,
    // confirmBookingAfterPayment,
    getAllBookings,
}
