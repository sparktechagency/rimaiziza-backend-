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

const createExtendBookingPaymentController = catchAsync(
    async (req, res) => {
        const { id: userId } = req.user as any;
        const { bookingId } = req.params;
        const { newToDate } = req.body;

        const sessionUrl = await TransactionServices.createExtendBookingPaymentSession(
            bookingId,
            userId,
            new Date(newToDate)
        );

        sendResponse(res, {
            success: true,
            statusCode: 200,
            message: "Extend booking payment session created successfully",
            data: sessionUrl,
        });
    }
);

export const TransactionControllers = {
    createBookingPaymentSession,
    createExtendBookingPaymentController,
}
