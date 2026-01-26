import { z } from "zod";

export const initiatePaymentSchema = z.object({body: z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid booking ID"),
  customerEmail: z.string().email("Valid email required"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().optional(),
 
}),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
