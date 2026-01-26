// src/payment/payment.interface.ts

export interface InitiatePaymentDto {
  bookingId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
}

export interface PaymentSuccessResponse {
  success: true;
  paymentUrl: string;
  sessionId: string;
  message?: string;
}

export interface PaymentErrorResponse {
  success: false;
  message: string;
  errors?: string[];
}
