import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import {  PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await PaymentService.createCheckoutSession(payload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment session initiated successfully!",
    data: result,
  });
});
 


const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    return res.status(400).send("Missing stripe-signature");
  }

  const result = await PaymentService.handleWebhook(req.body, sig);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Webhook received",
    data: { received: true, success: result },
  });
});

const success = catchAsync(async (_req: Request, res: Response) => {
  res.redirect("myapp://payment-success"); 
});

const cancel = catchAsync(async (_req: Request, res: Response) => {
  res.redirect("myapp://payment-failed");
});

const payoutToHostController = catchAsync(async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const result = await PaymentService.payoutToHost(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Host payout completed successfully",
    data: result,
  });
});

// -------- Export as object ----------

export const PaymentController = {
  initiatePayment,
  stripeWebhook,
  success,
  cancel,
  payoutToHostController,
};
