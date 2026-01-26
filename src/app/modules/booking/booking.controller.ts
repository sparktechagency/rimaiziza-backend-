import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { BookingService } from "./booking.service";

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id || (req as any).user.id;
  const payload = req.body;

  console.log("Booking Payload:", payload);

  const result = await BookingService.createBooking(payload, userId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Booking created successfully!",
    data: result,
  });
});


/* -------------------- User Bookings -------------------- */
const myBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const status = req.query.status as string;

  const result = await BookingService.getUserBookings(userId, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User bookings retrieved successfully",
    data: result,
  });
});

/* -------------------- Host Bookings -------------------- */
const hostBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const status = req.query.status as string;

  const result = await BookingService.getHostBookings(userId, status);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Host bookings retrieved successfully",
    data: result,
  });
});

/* -------------------- Check-in -------------------- */
const checkInController = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const result = await BookingService.checkIn(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Checked in successfully!",
    data: result,
  });
});

/* -------------------- Check-out -------------------- */
const checkOutController = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const result = await BookingService.checkOut(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Checked out successfully!",
    data: result,
  });
});

/* -------------------- Cancel Booking -------------------- */
const isCancelledController = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const result = await BookingService.isCancelled(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking cancelled & refund processed",
    data: { isCancelled: result },
  });
});

/* ============ Admin: Get All Bookings (Advanced) ============ */
const getAllBookingsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BookingService.getAllBookingsForAdmin(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "All bookings retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);


/* ================= Booking By ID ==================== */
const getBookingByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    const result = await BookingService.getBookingById(bookingId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Booking retrieved successfully",
      data: result,
    });
  }
);

/* ============ Admin: Update Booking ============ */
const updateBookingByAdminController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await BookingService.updateBookingByAdmin(id, req.body);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Booking updated successfully",
      data: result,
    });
  }
);

/* ============ Admin: Delete Booking ============ */
const deleteBookingByAdminController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await BookingService.deleteBookingByAdmin(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Booking deleted successfully",
      data: result,
    });
  }
);

// ========== Get booking status stats for chart ==========

const getBookingStatusStatsController = catchAsync(async (req: Request, res: Response) => {
  // year optional – string hisebe asbe query te
  const year = req.query.year ? Number(req.query.year) : undefined;

  // Optional validation
  if (year && (isNaN(year) || year < 2000 || year > 2100)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Invalid year provided",
    });
  }

  const result = await BookingService.getBookingStatusStats(year);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Yearly booking status stats retrieved successfully",
    data: result,
  });
});
// -------- Export as object ----------

export const BookingController = {
  createBooking,
  myBookings,
  hostBookings,
  checkInController,
  checkOutController,
  isCancelledController,
  getAllBookingsController,
  getBookingByIdController,
  updateBookingByAdminController,
  deleteBookingByAdminController,
  getBookingStatusStatsController,
};
