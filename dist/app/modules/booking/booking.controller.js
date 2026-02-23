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
exports.BookingControllers = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const booking_service_1 = require("./booking.service");
const createBookingToDB = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payload = req.body;
    const { id: userId } = req.user;
    const result = yield booking_service_1.BookingServices.createBookingToDB(payload, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Booking created successfully",
        data: result,
    });
}));
const getHostBookings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const result = yield booking_service_1.BookingServices.getHostBookingsFromDB(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Host bookings fetched successfully",
        data: result,
    });
}));
const getUserBookings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const result = yield booking_service_1.BookingServices.getUserBookingsFromDB(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "User bookings fetched successfully",
        data: result,
    });
}));
const approveBookingByHost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: hostId } = req.user;
    const { bookingId } = req.params;
    console.log(bookingId, "BookingId");
    const result = yield booking_service_1.BookingServices.approveBookingByHostFromDB(bookingId, hostId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Booking approved successfully",
        data: result,
    });
}));
const cancelBooking = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: actorId, role } = req.user;
    const { bookingId } = req.params;
    const result = yield booking_service_1.BookingServices.cancelBookingFromDB(bookingId, actorId, role);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Booking cancelled successfully",
        data: result,
    });
}));
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
const getAllBookings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield booking_service_1.BookingServices.getAllBookingsFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "All bookings fetched successfully",
        data: result.bookings,
        meta: result.meta,
    });
}));
const getSelfBookingsByHost = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: hostId } = req.user;
    const { status } = req.query;
    const result = yield booking_service_1.BookingServices.getSelfBookingsByHost(hostId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Self bookings fetched successfully",
        data: result,
    });
}));
exports.BookingControllers = {
    createBookingToDB,
    getHostBookings,
    getUserBookings,
    approveBookingByHost,
    cancelBooking,
    // confirmBookingAfterPayment,
    getAllBookings,
    getSelfBookingsByHost,
};
