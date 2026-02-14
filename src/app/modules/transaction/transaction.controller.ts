import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TransactionServices } from "./transaction.service";

const createBookingPaymentSession = catchAsync(async (req, res) => {
    const { id: userId } = req.user as any;
    const { bookingId } = req.params;
    console.log(bookingId, "BOOKING ID")
    const paymentUrl = await TransactionServices.createBookingPaymentSession(bookingId, userId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Payment session created successfully",
        data: paymentUrl,
    })
})

export const TransactionControllers = {
    createBookingPaymentSession,
}